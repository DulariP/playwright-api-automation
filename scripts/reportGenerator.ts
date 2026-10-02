import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

const REPORT_DIR = path.join(process.cwd(), "reports/json");
const OUTPUT_DIR = path.join(process.cwd(), "reports");
const REPORT_URL = "https://dularip.github.io/playwright-api-automation/";

// Raw Allure results per environment: reports/allure/<env>/*-result.json
const ALLURE_DIR = path.join(process.cwd(), "reports/allure");

// Reports that make up the headline totals. qa + staging run the full suite,
// so adding smoke/regression here would count the same tests again.
const COUNTED_REPORTS = ["qa", "staging"];

// Every report the pipeline is supposed to produce (used to flag crashed jobs).
const EXPECTED_REPORTS = ["smoke", "regression", "qa", "staging"];

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type Outcome = "passed" | "failed" | "skipped";
type PdfDoc = InstanceType<typeof PDFDocument>;

interface Counts {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  flaky: number; // already included in "passed" (passed after a retry)
}

interface Failure {
  title: string;
  reason: string;
  reports: string[];
}

interface Summary extends Counts {
  byReport: Record<string, Counts>;
  failures: Failure[];
  missingReports: string[];
}

interface LoadedReport {
  name: string;
  data: any;
}

interface AllureTest {
  name: string;
  suite: string;
  status: string; // passed | failed | broken | skipped | unknown
  duration: number; // ms
  attempts: number; // how many times it ran (retries)
  message?: string | undefined;
  failedStep?: string | undefined;
}

interface AllureCounts {
  passed: number;
  failed: number;
  broken: number;
  skipped: number;
  [status: string]: number; // any other Allure status (e.g. "unknown")
}

interface AllureEnv {
  environment: string;
  total: number;
  counts: AllureCounts;
  totalDuration: number; // ms, sum of test durations
  startedAt?: number | undefined; // epoch ms
  slowest?: AllureTest | undefined;
  tests: AllureTest[];
}

/* ------------------------------------------------------------------ */
/* Reading Playwright reports                                          */
/* ------------------------------------------------------------------ */

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Find Playwright JSON reports (*-report.json) recursively under reports/json.
 * File names look like: smoke-report.json, regression-report.json,
 * qa-report.json, staging-report.json
 */
function getReportFiles(directory: string = REPORT_DIR): string[] {
  if (!fs.existsSync(directory)) {
    throw new Error(`reports folder not found: ${directory}`);
  }

  let files: string[] = [];

  fs.readdirSync(directory).forEach((file) => {
    const fullPath = path.join(directory, file);

    if (fs.statSync(fullPath).isDirectory()) {
      files = files.concat(getReportFiles(fullPath));
    } else if (file.endsWith("-report.json")) {
      files.push(fullPath);
    }
  });

  return files;
}

function readReports(): LoadedReport[] {
  const files = getReportFiles();

  if (files.length === 0) {
    throw new Error("No JSON reports found");
  }

  const reports: LoadedReport[] = [];

  files.forEach((filePath) => {
    const name = path.basename(filePath).replace("-report.json", "");

    // Ignore stray files (e.g. a committed json-test-report.json)
    if (!EXPECTED_REPORTS.includes(name)) {
      console.log(`Ignoring unexpected report file: ${filePath}`);
      return;
    }

    try {
      reports.push({
        name,
        data: JSON.parse(fs.readFileSync(filePath, "utf-8")),
      });
    } catch (error) {
      console.warn(`Skipping unreadable report: ${filePath}`, error);
    }
  });

  if (reports.length === 0) {
    throw new Error("No valid JSON reports could be parsed");
  }

  return reports;
}

/* ------------------------------------------------------------------ */
/* Playwright analysis                                                 */
/* ------------------------------------------------------------------ */

const emptyCounts = (): Counts => ({
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  flaky: 0,
});

function record(counts: Counts, outcome: Outcome, flaky: boolean) {
  counts.total++;
  counts[outcome]++;
  if (flaky) counts.flaky++;
}

// Playwright JSON test.status: expected | unexpected | flaky | skipped
// ("unexpected" also covers timedOut / interrupted tests)
function classify(status: string): { outcome: Outcome; flaky: boolean } {
  switch (status) {
    case "expected":
      return { outcome: "passed", flaky: false };
    case "flaky":
      return { outcome: "passed", flaky: true };
    case "unexpected":
      return { outcome: "failed", flaky: false };
    default:
      return { outcome: "skipped", flaky: false };
  }
}

// Playwright error messages contain terminal colour codes
function stripAnsi(text: string): string {
  return text.replace(/\u001b\[[0-9;]*m/g, "");
}

function analyseTests(reports: LoadedReport[]): Summary {
  const summary: Summary = {
    ...emptyCounts(),
    byReport: {},
    failures: [],
    missingReports: EXPECTED_REPORTS.filter(
      (name) => !reports.some((r) => r.name === name),
    ),
  };

  // One entry per failing test, listing every report it failed in
  const failureMap = new Map<string, Failure>();

  reports.forEach((report) => {
    const perReport = emptyCounts();
    summary.byReport[report.name] = perReport;

    const isCounted = COUNTED_REPORTS.includes(report.name);

    const processSuite = (suite: any) => {
      suite.specs?.forEach((spec: any) => {
        spec.tests?.forEach((test: any) => {
          const { outcome, flaky } = classify(test.status);

          record(perReport, outcome, flaky);
          if (isCounted) record(summary, outcome, flaky);

          if (outcome === "failed") {
            const last = test.results?.[test.results.length - 1];
            const reason = stripAnsi(last?.error?.message || "Unknown error");

            const existing = failureMap.get(spec.title);
            if (existing) {
              if (!existing.reports.includes(report.name)) {
                existing.reports.push(report.name);
              }
            } else {
              failureMap.set(spec.title, {
                title: spec.title,
                reason,
                reports: [report.name],
              });
            }
          }
        });
      });

      suite.suites?.forEach(processSuite);
    };

    report.data.suites?.forEach(processSuite);
  });

  summary.failures = Array.from(failureMap.values());

  return summary;
}

function getStatus(summary: Summary): "PASSED" | "FAILED" | "INCOMPLETE" {
  const anyFailed = Object.values(summary.byReport).some((c) => c.failed > 0);

  if (anyFailed) return "FAILED";
  if (summary.missingReports.length > 0 || summary.total === 0) {
    return "INCOMPLETE";
  }
  return "PASSED";
}

/* ------------------------------------------------------------------ */
/* Allure results (raw *-result.json files)                            */
/* ------------------------------------------------------------------ */

const STATUS_ORDER: Record<string, number> = {
  failed: 0,
  broken: 1,
  skipped: 2,
  unknown: 3,
  passed: 4,
};

function getLabel(result: any, name: string): string {
  return (
    result.labels?.find((l: any) => l.name === name)?.value || ""
  ).toString();
}

// First failed/broken step (deepest one), e.g. "Expect status 200"
function findFailedStep(steps: any[] | undefined): string | undefined {
  for (const step of steps || []) {
    if (step.status === "failed" || step.status === "broken") {
      return findFailedStep(step.steps) || step.name;
    }
  }
  return undefined;
}

function buildAllureEnv(environment: string, dir: string): AllureEnv {
  // With retries Allure writes one result per attempt (same historyId).
  // Keep the latest attempt and remember how many attempts there were.
  const latest = new Map<string, any>();
  const attempts = new Map<string, number>();

  fs.readdirSync(dir)
    .filter((file) => file.endsWith("-result.json"))
    .forEach((file) => {
      try {
        const result = JSON.parse(
          fs.readFileSync(path.join(dir, file), "utf-8"),
        );
        const key = result.historyId || result.fullName || result.name || file;

        attempts.set(key, (attempts.get(key) || 0) + 1);

        const previous = latest.get(key);
        if (!previous || (result.stop || 0) >= (previous.stop || 0)) {
          latest.set(key, result);
        }
      } catch (error) {
        console.warn(`Skipping unreadable Allure file: ${file}`, error);
      }
    });

  const counts: AllureCounts = {
    passed: 0,
    failed: 0,
    broken: 0,
    skipped: 0,
  };

  const tests: AllureTest[] = [];
  let startedAt: number | undefined;

  latest.forEach((result, key) => {
    const status = result.status || "unknown";
    counts[status] = (counts[status] || 0) + 1;

    if (result.start && (!startedAt || result.start < startedAt)) {
      startedAt = result.start;
    }

    tests.push({
      name: result.name || result.fullName || "Unnamed test",
      suite: getLabel(result, "suite") || getLabel(result, "parentSuite"),
      status,
      duration: Math.max(0, (result.stop || 0) - (result.start || 0)),
      attempts: attempts.get(key) || 1,
      message:
        status === "failed" || status === "broken"
          ? stripAnsi(result.statusDetails?.message || "")
          : undefined,
      failedStep:
        status === "failed" || status === "broken"
          ? findFailedStep(result.steps)
          : undefined,
    });
  });

  // Failures first, then by suite and name
  tests.sort(
    (a, b) =>
      (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3) ||
      a.suite.localeCompare(b.suite) ||
      a.name.localeCompare(b.name),
  );

  const slowest = tests.reduce<AllureTest | undefined>(
    (max, t) => (!max || t.duration > max.duration ? t : max),
    undefined,
  );

  return {
    environment,
    total: tests.length,
    counts,
    totalDuration: tests.reduce((sum, t) => sum + t.duration, 0),
    startedAt,
    slowest,
    tests,
  };
}

function readAllureEnvironments(): AllureEnv[] {
  if (!fs.existsSync(ALLURE_DIR)) {
    console.warn(`No Allure results folder found: ${ALLURE_DIR}`);
    return [];
  }

  return fs
    .readdirSync(ALLURE_DIR)
    .filter((entry) => fs.statSync(path.join(ALLURE_DIR, entry)).isDirectory())
    .sort()
    .map((env) => buildAllureEnv(env, path.join(ALLURE_DIR, env)))
    .filter((env) => env.total > 0);
}

/* ------------------------------------------------------------------ */
/* Email / text output                                                 */
/* ------------------------------------------------------------------ */

function createReportText(summary: Summary): string {
  const hr = "=================================";
  const lines: string[] = [];

  lines.push(`Execution Status: ${getStatus(summary)}`, "");

  lines.push(`Test Summary (${COUNTED_REPORTS.join(" + ")})`, hr);
  lines.push(`Total Tests : ${summary.total}`);
  lines.push(
    `Passed      : ${summary.passed}` +
      (summary.flaky > 0 ? ` (${summary.flaky} flaky, passed on retry)` : ""),
  );
  lines.push(`Failed      : ${summary.failed}`);
  lines.push(`Skipped     : ${summary.skipped}`, "");

  lines.push("Breakdown by report", hr);
  Object.entries(summary.byReport).forEach(([name, c]) => {
    lines.push(
      `${name.padEnd(12)} total ${c.total} | passed ${c.passed} | failed ${c.failed} | skipped ${c.skipped}`,
    );
  });
  lines.push("");

  if (summary.missingReports.length > 0) {
    lines.push("Missing reports (the job may have crashed)", hr);
    lines.push(summary.missingReports.join(", "), "");
  }

  if (summary.failures.length > 0) {
    lines.push("Failed Tests", hr, "");
    summary.failures.forEach((failure, index) => {
      lines.push(`${index + 1}. ${failure.title}`);
      lines.push(`Reports: ${failure.reports.join(", ")}`);
      lines.push(`Reason: ${failure.reason.slice(0, 600)}`, "");
    });
  }

  lines.push("Reports", hr, REPORT_URL, "");

  return lines.join("\n");
}

function createEmailBody(summary: Summary): string {
  return `Playwright API Automation Report\n=================================\n\n${createReportText(summary)}`;
}

function createSubject(summary: Summary): string {
  switch (getStatus(summary)) {
    case "FAILED":
      return `❌ API Automation Pipeline FAILED | ${summary.failures.length} Failed`;
    case "INCOMPLETE":
      return `⚠️ API Automation Pipeline INCOMPLETE | Missing: ${
        summary.missingReports.join(", ") || "no tests found"
      }`;
    default:
      return `✅ API Automation Pipeline PASSED | ${summary.passed} Passed`;
  }
}

/* ------------------------------------------------------------------ */
/* PDF                                                                 */
/* ------------------------------------------------------------------ */

const STATUS_COLORS: Record<string, string> = {
  passed: "#2e7d32",
  failed: "#c62828",
  broken: "#ef6c00",
  skipped: "#757575",
  unknown: "#757575",
};

const TABLE_COLUMNS = [
  { title: "#", width: 25 },
  { title: "Test", width: 255 },
  { title: "Suite", width: 100 },
  { title: "Status", width: 55 },
  { title: "Time", width: 60 },
];

const ROW_HEIGHT = 15;

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;

  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)} s`;

  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${Math.round(seconds - minutes * 60)}s`;
}

function formatUtc(epochMs: number): string {
  return `${new Date(epochMs).toISOString().replace("T", " ").slice(0, 19)} UTC`;
}

function ensureSpace(doc: PdfDoc, needed: number) {
  if (doc.y + needed > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }
}

function drawTableRow(
  doc: PdfDoc,
  y: number,
  cells: string[],
  options: {
    header?: boolean | undefined;
    statusColor?: string | undefined;
  } = {},
) {
  const left = doc.page.margins.left;
  const tableWidth = TABLE_COLUMNS.reduce((sum, c) => sum + c.width, 0);

  if (options.header) {
    doc.rect(left, y - 2, tableWidth, ROW_HEIGHT).fill("#e8e8e8");
  }

  let x = left;

  cells.forEach((cell, i) => {
    const column = TABLE_COLUMNS[i];
    if (!column) return;

    const isStatusCell = i === 3 && !options.header;

    doc
      .font(options.header ? "Helvetica-Bold" : "Helvetica")
      .fontSize(8)
      .fillColor(
        isStatusCell && options.statusColor ? options.statusColor : "#000000",
      )
      .text(cell, x + 2, y, {
        width: column.width - 4,
        height: ROW_HEIGHT - 3,
        ellipsis: true,
      });

    x += column.width;
  });

  doc.fillColor("#000000");
}

function drawAllureTable(doc: PdfDoc, tests: AllureTest[]) {
  const maxY = () => doc.page.height - doc.page.margins.bottom;
  const headerCells = TABLE_COLUMNS.map((c) => c.title);

  let y = doc.y;

  if (y + ROW_HEIGHT * 2 > maxY()) {
    doc.addPage();
    y = doc.page.margins.top;
  }

  drawTableRow(doc, y, headerCells, { header: true });
  y += ROW_HEIGHT;

  tests.forEach((test, index) => {
    if (y + ROW_HEIGHT > maxY()) {
      doc.addPage();
      y = doc.page.margins.top;
      drawTableRow(doc, y, headerCells, { header: true });
      y += ROW_HEIGHT;
    }

    const retried = test.attempts > 1 ? ` [x${test.attempts}]` : "";

    drawTableRow(
      doc,
      y,
      [
        String(index + 1),
        `${test.name}${retried}`,
        test.suite,
        test.status,
        formatDuration(test.duration),
      ],
      { statusColor: STATUS_COLORS[test.status] },
    );

    y += ROW_HEIGHT;
  });

  doc.x = doc.page.margins.left;
  doc.y = y + 6;
}

function drawFailureDetails(doc: PdfDoc, tests: AllureTest[]) {
  const failed = tests.filter(
    (t) => t.status === "failed" || t.status === "broken",
  );

  if (failed.length === 0) return;

  ensureSpace(doc, 50);
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#000000")
    .text("Failure details");
  doc.moveDown(0.3);

  failed.forEach((test) => {
    ensureSpace(doc, 60);

    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .text(`${test.name} (${test.status})`);

    if (test.failedStep) {
      doc.font("Helvetica").fontSize(8).text(`Failed step: ${test.failedStep}`);
    }

    doc
      .font("Courier")
      .fontSize(8)
      .text((test.message || "No message").slice(0, 500));

    doc.moveDown(0.5);
  });
}

function drawAllureEnvironment(doc: PdfDoc, env: AllureEnv) {
  ensureSpace(doc, 110);

  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor("#000000")
    .text(`Environment: ${env.environment}`);
  doc.moveDown(0.3);

  const c = env.counts;

  doc
    .font("Helvetica")
    .fontSize(9)
    .text(
      `Total ${env.total}  |  Passed ${c.passed}  |  Failed ${c.failed}  |  Broken ${c.broken}  |  Skipped ${c.skipped}`,
    );

  doc.text(
    `Total test time: ${formatDuration(env.totalDuration)}` +
      (env.startedAt ? `  |  Started: ${formatUtc(env.startedAt)}` : ""),
  );

  if (env.slowest) {
    doc.text(
      `Slowest test: ${env.slowest.name} (${formatDuration(env.slowest.duration)})`,
    );
  }

  doc.moveDown(0.5);

  drawAllureTable(doc, env.tests);
  drawFailureDetails(doc, env.tests);

  doc.moveDown();
}

function drawAllureSection(doc: PdfDoc, allureEnvs: AllureEnv[]) {
  doc.addPage();

  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor("#000000")
    .text("Allure Report Details");
  doc.moveDown(0.3);

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#1a56db")
    .text(`Full interactive report: ${REPORT_URL}`, {
      link: REPORT_URL,
      underline: true,
    });
  doc.fillColor("#000000");
  doc.moveDown();

  if (allureEnvs.length === 0) {
    doc.fontSize(10).text("No Allure results were found for this run.");
    return;
  }

  allureEnvs.forEach((env) => drawAllureEnvironment(doc, env));
}

function createPdf(summary: Summary, allureEnvs: AllureEnv[]) {
  const pdfPath = path.join(OUTPUT_DIR, "API_Test_Report.pdf");

  const doc = new PDFDocument({ margin: 50, size: "A4" });
  doc.pipe(fs.createWriteStream(pdfPath));

  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .text("Playwright API Automation Report");
  doc.moveDown();
  doc.font("Courier").fontSize(9).text(createReportText(summary));

  drawAllureSection(doc, allureEnvs);

  doc.end();

  console.log(`PDF created: ${pdfPath}`);
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

const reports = readReports();

console.log(
  "Reports found:",
  reports.map((r) => r.name),
);

const summary = analyseTests(reports);
const allureEnvs = readAllureEnvironments();

console.log(
  "Allure environments:",
  allureEnvs.map((e) => `${e.environment} (${e.total} tests)`),
);

fs.writeFileSync(path.join(OUTPUT_DIR, "email.txt"), createEmailBody(summary));

fs.writeFileSync(
  path.join(OUTPUT_DIR, "summary.json"),
  JSON.stringify(summary, null, 2),
);

createPdf(summary, allureEnvs);

fs.writeFileSync(
  path.join(OUTPUT_DIR, "email-subject.txt"),
  createSubject(summary),
);

console.log("Report generation completed successfully");
