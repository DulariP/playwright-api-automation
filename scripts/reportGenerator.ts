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

// PDF options
const SHOW_TEST_DETAILS = true; // per-test block with steps + failure details
const MAX_STEPS_PER_TEST = 30; // cap so one huge test can't flood the PDF
const SLOWEST_COUNT = 5;
const LOCAL_TZ_OFFSET_MINUTES = 330; // Sri Lanka (UTC+5:30), shown next to UTC
const LOCAL_TZ_LABEL = "Sri Lanka";

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

interface AllureStep {
  name: string;
  status: string;
  duration: number; // ms
  depth: number;
}

interface AllureTest {
  name: string;
  suite: string;
  feature: string;
  epic: string;
  story: string;
  severity: string;
  owner: string;
  tags: string[];
  status: string; // passed | failed | broken | skipped | unknown
  start: number;
  stop: number;
  duration: number; // ms
  attempts: number; // how many times it ran (retries)
  attachments: number; // screenshots, videos, traces ...
  steps: AllureStep[];
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
  finishedAt?: number | undefined; // epoch ms
  slowest: AllureTest[];
  details: [string, string][]; // framework, language, host ...
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

function getLabels(result: any, name: string): string[] {
  return (result.labels || [])
    .filter((l: any) => l.name === name && l.value)
    .map((l: any) => String(l.value));
}

function getLabel(result: any, name: string): string {
  return getLabels(result, name)[0] || "";
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

function flattenSteps(
  steps: any[] | undefined,
  depth: number = 0,
  out: AllureStep[] = [],
): AllureStep[] {
  for (const step of steps || []) {
    out.push({
      name: step.name || "(unnamed step)",
      status: step.status || "unknown",
      duration: Math.max(0, (step.stop || 0) - (step.start || 0)),
      depth,
    });

    if (depth < 3) flattenSteps(step.steps, depth + 1, out);
  }
  return out;
}

function countAttachments(node: any): number {
  let total = node.attachments?.length || 0;
  for (const step of node.steps || []) total += countAttachments(step);
  return total;
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
  const detailValues: Record<string, string> = {};
  let startedAt: number | undefined;
  let finishedAt: number | undefined;

  latest.forEach((result, key) => {
    const status = result.status || "unknown";
    const isFailure = status === "failed" || status === "broken";

    counts[status] = (counts[status] || 0) + 1;

    if (result.start && (!startedAt || result.start < startedAt)) {
      startedAt = result.start;
    }
    if (result.stop && (!finishedAt || result.stop > finishedAt)) {
      finishedAt = result.stop;
    }

    ["framework", "language", "host"].forEach((label) => {
      if (!detailValues[label]) detailValues[label] = getLabel(result, label);
    });

    tests.push({
      name: result.name || result.fullName || "Unnamed test",
      suite: getLabel(result, "suite") || getLabel(result, "parentSuite"),
      feature: getLabel(result, "feature"),
      epic: getLabel(result, "epic"),
      story: getLabel(result, "story"),
      severity: getLabel(result, "severity"),
      owner: getLabel(result, "owner"),
      tags: getLabels(result, "tag"),
      status,
      start: result.start || 0,
      stop: result.stop || 0,
      duration: Math.max(0, (result.stop || 0) - (result.start || 0)),
      attempts: attempts.get(key) || 1,
      attachments: countAttachments(result),
      steps: flattenSteps(result.steps),
      message: isFailure
        ? stripAnsi(result.statusDetails?.message || "")
        : undefined,
      failedStep: isFailure ? findFailedStep(result.steps) : undefined,
    });
  });

  // Failures first, then by suite and name
  tests.sort(
    (a, b) =>
      (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3) ||
      a.suite.localeCompare(b.suite) ||
      a.name.localeCompare(b.name),
  );

  const slowest = [...tests]
    .sort((a, b) => b.duration - a.duration)
    .slice(0, SLOWEST_COUNT);

  const details: [string, string][] = [];
  const framework = detailValues["framework"];
  const language = detailValues["language"];
  const host = detailValues["host"];
  if (framework) details.push(["Framework", framework]);
  if (language) details.push(["Language", language]);
  if (host) details.push(["Host", host]);

  return {
    environment,
    total: tests.length,
    counts,
    totalDuration: tests.reduce((sum, t) => sum + t.duration, 0),
    startedAt,
    finishedAt,
    slowest,
    details,
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
/* PDF helpers                                                         */
/* ------------------------------------------------------------------ */

const PAGE_MARGIN = 40;

const COLORS = {
  text: "#111827",
  muted: "#6b7280",
  panel: "#f3f4f6",
  header: "#e5e7eb",
  zebra: "#f9fafb",
  link: "#1a56db",
  pass: "#2e7d32",
  fail: "#c62828",
  warn: "#ef6c00",
  skip: "#757575",
  white: "#ffffff",
};

const STATUS_COLORS: Record<string, string> = {
  passed: COLORS.pass,
  failed: COLORS.fail,
  broken: COLORS.warn,
  skipped: COLORS.skip,
  unknown: COLORS.skip,
  PASSED: COLORS.pass,
  FAILED: COLORS.fail,
  INCOMPLETE: COLORS.warn,
};

const SEVERITY_ORDER = ["blocker", "critical", "normal", "minor", "trivial"];

const contentWidth = (doc: PdfDoc): number => doc.page.width - PAGE_MARGIN * 2;

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;

  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)} s`;

  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${Math.round(seconds - minutes * 60)}s`;
}

function formatUtc(epochMs: number): string {
  return `${new Date(epochMs).toISOString().replace("T", " ").slice(0, 19)} UTC`;
}

function formatDateTime(epochMs: number): string {
  const local = new Date(epochMs + LOCAL_TZ_OFFSET_MINUTES * 60000)
    .toISOString()
    .replace("T", " ")
    .slice(0, 19);

  return `${formatUtc(epochMs)}   |   ${local} ${LOCAL_TZ_LABEL}`;
}

function pct(part: number, total: number): string {
  if (total === 0) return "-";

  const value = (part / total) * 100;
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

function getRunInfo(): [string, string][] {
  const env = process.env;
  const rows: [string, string][] = [["Generated", formatDateTime(Date.now())]];

  const trigger = env["GITHUB_EVENT_NAME"];
  const branch = env["GITHUB_REF_NAME"];
  const sha = env["GITHUB_SHA"];
  const runNumber = env["GITHUB_RUN_NUMBER"];

  if (trigger) rows.push(["Trigger", trigger]);
  if (branch) rows.push(["Branch", branch]);
  if (sha) rows.push(["Commit", sha.slice(0, 7)]);
  if (runNumber) rows.push(["Run number", `#${runNumber}`]);

  return rows;
}

function getRunUrl(): string | undefined {
  const env = process.env;
  const server = env["GITHUB_SERVER_URL"];
  const repository = env["GITHUB_REPOSITORY"];
  const runId = env["GITHUB_RUN_ID"];

  return server && repository && runId
    ? `${server}/${repository}/actions/runs/${runId}`
    : undefined;
}

function ensureSpace(doc: PdfDoc, needed: number) {
  if (doc.y + needed > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }
}

function drawHeading(doc: PdfDoc, text: string, size: number = 12) {
  ensureSpace(doc, size + 40);

  doc
    .font("Helvetica-Bold")
    .fontSize(size)
    .fillColor(COLORS.text)
    .text(text, PAGE_MARGIN, doc.y, { width: contentWidth(doc) });

  doc.moveDown(0.4);
  doc.fillColor(COLORS.text);
}

function drawNote(doc: PdfDoc, text: string, color: string = COLORS.muted) {
  doc
    .font("Helvetica")
    .fontSize(7.5)
    .fillColor(color)
    .text(text, PAGE_MARGIN, doc.y, { width: contentWidth(doc) });

  doc.moveDown(0.5);
  doc.fillColor(COLORS.text);
}

function drawLink(doc: PdfDoc, label: string, url: string) {
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(COLORS.link)
    .text(`${label}: ${url}`, PAGE_MARGIN, doc.y, {
      width: contentWidth(doc),
      link: url,
      underline: true,
    });

  doc.moveDown(0.3);
  doc.fillColor(COLORS.text);
}

interface Kpi {
  label: string;
  value: string;
  color?: string | undefined;
}

function drawKpis(doc: PdfDoc, kpis: Kpi[]) {
  const gap = 8;
  const boxHeight = 44;
  const boxWidth = (contentWidth(doc) - gap * (kpis.length - 1)) / kpis.length;
  const valueSize = kpis.length > 6 ? 14 : 18;

  ensureSpace(doc, boxHeight + 12);

  const y = doc.y;

  kpis.forEach((kpi, i) => {
    const x = PAGE_MARGIN + i * (boxWidth + gap);

    doc.rect(x, y, boxWidth, boxHeight).fill(COLORS.panel);

    doc
      .font("Helvetica-Bold")
      .fontSize(valueSize)
      .fillColor(kpi.color ?? COLORS.text)
      .text(kpi.value, x, y + 8, { width: boxWidth, align: "center" });

    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor(COLORS.muted)
      .text(kpi.label, x, y + 31, { width: boxWidth, align: "center" });
  });

  doc.fillColor(COLORS.text);
  doc.x = PAGE_MARGIN;
  doc.y = y + boxHeight + 12;
}

interface Column {
  title: string;
  weight: number;
  align?: "left" | "center" | "right" | undefined;
}

interface TableOptions {
  header?: boolean | undefined;
  rowHeight?: number | undefined;
  fontSize?: number | undefined;
  boldFirstColumn?: boolean | undefined;
  cellColor?:
    | ((column: number, value: string) => string | undefined)
    | undefined;
}

// Generic table with fixed row height, repeated header and page breaks
function drawTable(
  doc: PdfDoc,
  columns: Column[],
  rows: string[][],
  options: TableOptions = {},
) {
  const showHeader = options.header ?? true;
  const rowHeight = options.rowHeight ?? 15;
  const fontSize = options.fontSize ?? 8;
  const width = contentWidth(doc);
  const totalWeight = columns.reduce((sum, c) => sum + c.weight, 0);
  const widths = columns.map((c) => (c.weight / totalWeight) * width);
  const maxY = () => doc.page.height - doc.page.margins.bottom;

  const paintRow = (
    y: number,
    cells: string[],
    style: "header" | "even" | "odd",
  ) => {
    if (style === "header") {
      doc.rect(PAGE_MARGIN, y - 3, width, rowHeight).fill(COLORS.header);
    } else if (style === "odd") {
      doc.rect(PAGE_MARGIN, y - 3, width, rowHeight).fill(COLORS.zebra);
    }

    let x = PAGE_MARGIN;

    columns.forEach((column, i) => {
      const columnWidth = widths[i] ?? 0;
      const value = cells[i] ?? "";
      const isBold =
        style === "header" || (options.boldFirstColumn === true && i === 0);
      const color =
        style === "header"
          ? COLORS.text
          : (options.cellColor?.(i, value) ?? COLORS.text);

      doc
        .font(isBold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(fontSize)
        .fillColor(color)
        .text(value, x + 3, y, {
          width: columnWidth - 6,
          height: rowHeight - 4,
          ellipsis: true,
          align: column.align ?? "left",
        });

      x += columnWidth;
    });

    doc.fillColor(COLORS.text);
  };

  let y = doc.y + 3;

  // returns true when a new page was started
  const breakIfNeeded = (needed: number): boolean => {
    if (y - 3 + needed > maxY()) {
      doc.addPage();
      y = doc.page.margins.top + 3;
      return true;
    }
    return false;
  };

  breakIfNeeded(rowHeight * (showHeader ? 3 : 2));

  if (showHeader) {
    paintRow(
      y,
      columns.map((c) => c.title),
      "header",
    );
    y += rowHeight;
  }

  rows.forEach((cells, index) => {
    if (breakIfNeeded(rowHeight) && showHeader) {
      paintRow(
        y,
        columns.map((c) => c.title),
        "header",
      );
      y += rowHeight;
    }

    paintRow(y, cells, index % 2 === 1 ? "odd" : "even");
    y += rowHeight;
  });

  doc.x = PAGE_MARGIN;
  doc.y = y + 6;
}

const statusCellColor =
  (column: number) =>
  (index: number, value: string): string | undefined =>
    index === column ? STATUS_COLORS[value] : undefined;

function addPageNumbers(doc: PdfDoc) {
  const range = doc.bufferedPageRange();

  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);

    // Drawing inside the bottom margin would otherwise trigger a new page
    const bottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor(COLORS.muted)
      .text(
        `Playwright API Automation Report   |   Page ${i + 1} of ${range.count}`,
        PAGE_MARGIN,
        doc.page.height - 28,
        { width: contentWidth(doc), align: "center", lineBreak: false },
      );

    doc.page.margins.bottom = bottom;
  }
}

/* ------------------------------------------------------------------ */
/* PDF: overview page                                                  */
/* ------------------------------------------------------------------ */

function drawOverview(doc: PdfDoc, summary: Summary, hasAllure: boolean) {
  const status = getStatus(summary);
  const width = contentWidth(doc);

  doc
    .font("Helvetica-Bold")
    .fontSize(20)
    .fillColor(COLORS.text)
    .text("Playwright API Automation Report", PAGE_MARGIN, PAGE_MARGIN, {
      width,
    });
  doc.moveDown(0.5);

  const bannerY = doc.y;
  doc
    .rect(PAGE_MARGIN, bannerY, width, 28)
    .fill(STATUS_COLORS[status] ?? COLORS.skip);
  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor(COLORS.white)
    .text(`Execution Status: ${status}`, PAGE_MARGIN + 12, bannerY + 8, {
      width: width - 24,
    });
  doc.fillColor(COLORS.text);
  doc.x = PAGE_MARGIN;
  doc.y = bannerY + 42;

  /* Run details */
  drawHeading(doc, "Run Details");
  drawTable(
    doc,
    [
      { title: "", weight: 1 },
      { title: "", weight: 4 },
    ],
    getRunInfo().map(([key, value]) => [key, value]),
    { header: false, boldFirstColumn: true },
  );

  drawLink(doc, "Allure report", REPORT_URL);
  const runUrl = getRunUrl();
  if (runUrl) drawLink(doc, "Workflow run", runUrl);
  doc.moveDown(0.5);

  /* Summary */
  drawHeading(doc, `Test Summary (${COUNTED_REPORTS.join(" + ")})`);
  drawKpis(doc, [
    { label: "Total tests", value: String(summary.total) },
    { label: "Passed", value: String(summary.passed), color: COLORS.pass },
    {
      label: "Failed",
      value: String(summary.failed),
      color: summary.failed > 0 ? COLORS.fail : COLORS.text,
    },
    { label: "Skipped", value: String(summary.skipped) },
    { label: "Pass rate", value: pct(summary.passed, summary.total) },
  ]);

  if (summary.flaky > 0) {
    drawNote(
      doc,
      `${summary.flaky} test(s) were flaky: they failed first and passed on retry.`,
    );
  }

  /* Breakdown by report */
  drawHeading(doc, "Breakdown by Report");
  drawTable(
    doc,
    [
      { title: "Report", weight: 2 },
      { title: "Total", weight: 1, align: "center" },
      { title: "Passed", weight: 1, align: "center" },
      { title: "Failed", weight: 1, align: "center" },
      { title: "Skipped", weight: 1, align: "center" },
      { title: "Flaky", weight: 1, align: "center" },
      { title: "Pass rate", weight: 1.2, align: "center" },
      { title: "In total", weight: 1, align: "center" },
    ],
    Object.entries(summary.byReport).map(([name, c]) => [
      name,
      String(c.total),
      String(c.passed),
      String(c.failed),
      String(c.skipped),
      String(c.flaky),
      pct(c.passed, c.total),
      COUNTED_REPORTS.includes(name) ? "Yes" : "-",
    ]),
    { boldFirstColumn: true },
  );

  if (summary.missingReports.length > 0) {
    drawHeading(doc, "Missing Reports");
    drawNote(
      doc,
      `No results were received from: ${summary.missingReports.join(", ")}. The job may have crashed.`,
      COLORS.warn,
    );
  }

  /* Failures (from the Playwright reports) */
  if (summary.failures.length > 0) {
    drawHeading(doc, "Failed Tests");

    summary.failures.forEach((failure, index) => {
      ensureSpace(doc, 60);

      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(COLORS.text)
        .text(`${index + 1}. ${failure.title}`, PAGE_MARGIN, doc.y, {
          width,
        });

      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(COLORS.muted)
        .text(`Reports: ${failure.reports.join(", ")}`, PAGE_MARGIN, doc.y, {
          width,
        });

      doc
        .font("Courier")
        .fontSize(7.5)
        .fillColor(COLORS.fail)
        .text(failure.reason.slice(0, 600), PAGE_MARGIN, doc.y, { width });

      doc.fillColor(COLORS.text);
      doc.moveDown(0.6);
    });
  }

  if (!hasAllure) {
    drawHeading(doc, "Allure Report Details");
    drawNote(doc, "No Allure results were found for this run.");
  }
}

/* ------------------------------------------------------------------ */
/* PDF: Allure pages (one section per environment)                     */
/* ------------------------------------------------------------------ */

interface GroupRow {
  name: string;
  total: number;
  passed: number;
  failed: number;
  other: number;
}

function groupTests(
  tests: AllureTest[],
  pick: (test: AllureTest) => string[],
  sort?: (a: GroupRow, b: GroupRow) => number,
): GroupRow[] {
  const groups = new Map<string, GroupRow>();

  tests.forEach((test) => {
    pick(test).forEach((key) => {
      let row = groups.get(key);

      if (!row) {
        row = { name: key, total: 0, passed: 0, failed: 0, other: 0 };
        groups.set(key, row);
      }

      row.total++;

      if (test.status === "passed") row.passed++;
      else if (test.status === "failed" || test.status === "broken") {
        row.failed++;
      } else row.other++;
    });
  });

  return Array.from(groups.values()).sort(
    sort || ((a, b) => b.total - a.total || a.name.localeCompare(b.name)),
  );
}

const bySeverity = (a: GroupRow, b: GroupRow): number => {
  const rank = (name: string) => {
    const index = SEVERITY_ORDER.indexOf(name.toLowerCase());
    return index === -1 ? SEVERITY_ORDER.length : index;
  };
  return rank(a.name) - rank(b.name) || a.name.localeCompare(b.name);
};

function drawCoverage(doc: PdfDoc, env: AllureEnv) {
  drawHeading(doc, "Test Coverage");
  drawNote(
    doc,
    "Functional coverage taken from the Allure labels: how many tests exist per suite, feature, tag and severity, and how they performed. Allure does not measure code coverage.",
  );

  const dimensions: {
    title: string;
    pick: (test: AllureTest) => string[];
    sort?: (a: GroupRow, b: GroupRow) => number;
  }[] = [
    { title: "By suite", pick: (t) => (t.suite ? [t.suite] : []) },
    { title: "By epic", pick: (t) => (t.epic ? [t.epic] : []) },
    { title: "By feature", pick: (t) => (t.feature ? [t.feature] : []) },
    { title: "By story", pick: (t) => (t.story ? [t.story] : []) },
    { title: "By tag", pick: (t) => t.tags },
    {
      title: "By severity",
      pick: (t) => (t.severity ? [t.severity] : []),
      sort: bySeverity,
    },
  ];

  dimensions.forEach((dimension) => {
    // Skip a dimension nobody has labelled at all
    if (!env.tests.some((t) => dimension.pick(t).length > 0)) return;

    const rows = groupTests(
      env.tests,
      (t) => {
        const keys = dimension.pick(t);
        return keys.length > 0 ? keys : ["(not set)"];
      },
      dimension.sort,
    );

    ensureSpace(doc, 70);

    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor(COLORS.text)
      .text(dimension.title, PAGE_MARGIN, doc.y, { width: contentWidth(doc) });
    doc.moveDown(0.2);

    drawTable(
      doc,
      [
        { title: "Name", weight: 6 },
        { title: "Tests", weight: 1, align: "center" },
        { title: "Passed", weight: 1, align: "center" },
        { title: "Failed", weight: 1, align: "center" },
        { title: "Other", weight: 1, align: "center" },
        { title: "Pass rate", weight: 1.3, align: "center" },
      ],
      rows.map((r) => [
        r.name,
        String(r.total),
        String(r.passed),
        String(r.failed),
        String(r.other),
        pct(r.passed, r.total),
      ]),
    );
  });
}

function drawTestCaseTable(doc: PdfDoc, env: AllureEnv) {
  drawHeading(doc, "Test Cases");

  const hasSeverity = env.tests.some((t) => t.severity);

  const columns: Column[] = [
    { title: "#", weight: 0.6, align: "center" },
    { title: "Test case", weight: 6 },
    { title: "Suite", weight: 2.4 },
  ];
  if (hasSeverity) columns.push({ title: "Severity", weight: 1.2 });
  columns.push({ title: "Status", weight: 1.2 });
  columns.push({ title: "Time", weight: 1.1, align: "right" });

  const statusColumn = columns.length - 2;

  const rows = env.tests.map((test, index) => {
    const retried = test.attempts > 1 ? ` [x${test.attempts}]` : "";
    const cells = [String(index + 1), `${test.name}${retried}`, test.suite];
    if (hasSeverity) cells.push(test.severity);
    cells.push(test.status);
    cells.push(formatDuration(test.duration));
    return cells;
  });

  drawTable(doc, columns, rows, { cellColor: statusCellColor(statusColumn) });
}

function drawSlowestAndRetried(doc: PdfDoc, env: AllureEnv) {
  if (env.slowest.length > 0) {
    drawHeading(doc, `Slowest Tests (top ${env.slowest.length})`);
    drawTable(
      doc,
      [
        { title: "#", weight: 0.6, align: "center" },
        { title: "Test case", weight: 8 },
        { title: "Time", weight: 1.3, align: "right" },
      ],
      env.slowest.map((t, i) => [
        String(i + 1),
        t.name,
        formatDuration(t.duration),
      ]),
    );
  }

  const retried = env.tests.filter((t) => t.attempts > 1);

  if (retried.length > 0) {
    drawHeading(doc, "Retried Tests");
    drawNote(
      doc,
      "These tests ran more than once. A test that fails and then passes is flaky.",
    );
    drawTable(
      doc,
      [
        { title: "Test case", weight: 8 },
        { title: "Attempts", weight: 1.2, align: "center" },
        { title: "Final status", weight: 1.5 },
      ],
      retried.map((t) => [t.name, String(t.attempts), t.status]),
      { cellColor: statusCellColor(2) },
    );
  }
}

function drawFailureSummary(doc: PdfDoc, env: AllureEnv) {
  const failed = env.tests.filter(
    (t) => t.status === "failed" || t.status === "broken",
  );

  if (failed.length === 0) return;

  drawHeading(doc, "Failures");

  failed.forEach((test) => {
    ensureSpace(doc, 60);

    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor(COLORS.text)
      .text(`${test.name} (${test.status})`, PAGE_MARGIN, doc.y, {
        width: contentWidth(doc),
      });

    if (test.failedStep) {
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(COLORS.muted)
        .text(`Failed step: ${test.failedStep}`, PAGE_MARGIN, doc.y, {
          width: contentWidth(doc),
        });
    }

    doc
      .font("Courier")
      .fontSize(7.5)
      .fillColor(COLORS.fail)
      .text((test.message || "No message").slice(0, 600), PAGE_MARGIN, doc.y, {
        width: contentWidth(doc),
      });

    doc.fillColor(COLORS.text);
    doc.moveDown(0.6);
  });
}

function drawTestDetail(doc: PdfDoc, test: AllureTest, index: number) {
  const width = contentWidth(doc);
  const statusColor = STATUS_COLORS[test.status] ?? COLORS.skip;

  ensureSpace(doc, 90);

  const y = doc.y;

  doc.rect(PAGE_MARGIN, y, width, 18).fill(COLORS.header);

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(COLORS.text)
    .text(`${index}. ${test.name}`, PAGE_MARGIN + 6, y + 5, {
      width: width - 150,
      height: 11,
      ellipsis: true,
    });

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(statusColor)
    .text(
      `${test.status.toUpperCase()}   ${formatDuration(test.duration)}`,
      PAGE_MARGIN + width - 140,
      y + 5,
      { width: 134, height: 11, ellipsis: true, align: "right" },
    );

  doc.fillColor(COLORS.text);
  doc.x = PAGE_MARGIN;
  doc.y = y + 24;

  const meta: string[] = [];
  if (test.suite) meta.push(`Suite: ${test.suite}`);
  if (test.epic) meta.push(`Epic: ${test.epic}`);
  if (test.feature) meta.push(`Feature: ${test.feature}`);
  if (test.story) meta.push(`Story: ${test.story}`);
  if (test.severity) meta.push(`Severity: ${test.severity}`);
  if (test.owner) meta.push(`Owner: ${test.owner}`);
  if (test.tags.length > 0) meta.push(`Tags: ${test.tags.join(", ")}`);
  if (test.attempts > 1) meta.push(`Attempts: ${test.attempts}`);
  if (test.attachments > 0) meta.push(`Attachments: ${test.attachments}`);

  if (meta.length > 0) {
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text(meta.join("   |   "), PAGE_MARGIN, doc.y, { width });
    doc.moveDown(0.3);
  }

  if (test.steps.length > 0) {
    const shown = test.steps.slice(0, MAX_STEPS_PER_TEST);

    const rows = shown.map((step) => [
      `${"> ".repeat(step.depth)}${step.name}`,
      step.status,
      formatDuration(step.duration),
    ]);

    if (test.steps.length > shown.length) {
      rows.push([`... ${test.steps.length - shown.length} more steps`, "", ""]);
    }

    drawTable(
      doc,
      [
        { title: "Step", weight: 8 },
        { title: "Status", weight: 1.3 },
        { title: "Time", weight: 1.1, align: "right" },
      ],
      rows,
      { rowHeight: 12, fontSize: 7.5, cellColor: statusCellColor(1) },
    );
  }

  if (test.message) {
    doc
      .font("Courier")
      .fontSize(7.5)
      .fillColor(COLORS.fail)
      .text(test.message.slice(0, 600), PAGE_MARGIN, doc.y, { width });
    doc.fillColor(COLORS.text);
  }

  doc.moveDown(0.8);
}

function drawAllureEnvironment(doc: PdfDoc, env: AllureEnv) {
  doc.addPage();

  const c = env.counts;
  const failedCount = c.failed + c.broken;
  const average = env.total > 0 ? env.totalDuration / env.total : 0;

  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor(COLORS.text)
    .text(`Allure Report: ${env.environment}`, PAGE_MARGIN, PAGE_MARGIN, {
      width: contentWidth(doc),
    });
  doc.moveDown(0.4);

  drawLink(doc, "Full interactive report", REPORT_URL);
  doc.moveDown(0.3);

  drawKpis(doc, [
    { label: "Total", value: String(env.total) },
    { label: "Passed", value: String(c.passed), color: COLORS.pass },
    {
      label: "Failed",
      value: String(c.failed),
      color: c.failed > 0 ? COLORS.fail : COLORS.text,
    },
    {
      label: "Broken",
      value: String(c.broken),
      color: c.broken > 0 ? COLORS.warn : COLORS.text,
    },
    { label: "Skipped", value: String(c.skipped) },
    { label: "Pass rate", value: pct(c.passed, env.total) },
    { label: "Total time", value: formatDuration(env.totalDuration) },
  ]);

  const info: [string, string][] = [];
  if (env.startedAt) info.push(["Started", formatDateTime(env.startedAt)]);
  if (env.finishedAt) info.push(["Finished", formatDateTime(env.finishedAt)]);
  info.push(["Average test time", formatDuration(average)]);
  info.push(...env.details);

  drawTable(
    doc,
    [
      { title: "", weight: 1.3 },
      { title: "", weight: 5 },
    ],
    info.map(([key, value]) => [key, value]),
    { header: false, boldFirstColumn: true },
  );

  drawCoverage(doc, env);
  drawTestCaseTable(doc, env);
  drawSlowestAndRetried(doc, env);

  if (SHOW_TEST_DETAILS) {
    drawHeading(doc, "Test Case Details");
    drawNote(
      doc,
      failedCount > 0
        ? "Failed tests are listed first. Each block shows the test's steps and, for failures, the error message."
        : "Each block shows the test's steps with their status and duration.",
    );

    env.tests.forEach((test, index) => drawTestDetail(doc, test, index + 1));
  } else {
    drawFailureSummary(doc, env);
  }
}

function createPdf(summary: Summary, allureEnvs: AllureEnv[]) {
  const pdfPath = path.join(OUTPUT_DIR, "API_Test_Report.pdf");

  const doc = new PDFDocument({
    margin: PAGE_MARGIN,
    size: "A4",
    bufferPages: true,
    info: { Title: "Playwright API Automation Report" },
  });

  doc.pipe(fs.createWriteStream(pdfPath));

  drawOverview(doc, summary, allureEnvs.length > 0);
  allureEnvs.forEach((env) => drawAllureEnvironment(doc, env));
  addPageNumbers(doc);

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
