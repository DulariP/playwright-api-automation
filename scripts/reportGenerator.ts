import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

const REPORT_DIR = path.join(process.cwd(), "reports/json");
const OUTPUT_DIR = path.join(process.cwd(), "reports");
const REPORT_URL = "https://dularip.github.io/playwright-api-automation/";

// Reports that make up the headline totals. qa + staging run the full suite,
// so adding smoke/regression here would count the same tests again.
const COUNTED_REPORTS = ["qa", "staging"];

// Every report the pipeline is supposed to produce (used to flag crashed jobs).
const EXPECTED_REPORTS = ["smoke", "regression", "qa", "staging"];

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type Outcome = "passed" | "failed" | "skipped";

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

/* ------------------------------------------------------------------ */
/* Reading reports                                                     */
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
    try {
      reports.push({
        name: path.basename(filePath).replace("-report.json", ""),
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
/* Analysis                                                            */
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
/* Output                                                              */
/* ------------------------------------------------------------------ */

function createReportText(summary: Summary): string {
  const hr = "=================================";
  const lines: string[] = [];

  lines.push(`Execution Status: ${getStatus(summary)}`, "");

  lines.push(`Test Summary (${COUNTED_REPORTS.join(" + ")})`, hr);
  lines.push(`Total Tests : ${summary.total}`);
  lines.push(
    `Passed      : ${summary.passed}` +
      (summary.flaky > 0
        ? ` (${summary.flaky} flaky, passed on retry)`
        : ""),
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

function createPdf(summary: Summary) {
  const pdfPath = path.join(OUTPUT_DIR, "API_Test_Report.pdf");

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(fs.createWriteStream(pdfPath));

  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .text("Playwright API Automation Report");
  doc.moveDown();
  doc.font("Courier").fontSize(9).text(createReportText(summary));

  doc.end();

  console.log(`PDF created: ${pdfPath}`);
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
/* Main                                                                */
/* ------------------------------------------------------------------ */

const reports = readReports();

console.log(
  "Reports found:",
  reports.map((r) => r.name),
);

const summary = analyseTests(reports);

fs.writeFileSync(path.join(OUTPUT_DIR, "email.txt"), createEmailBody(summary));

fs.writeFileSync(
  path.join(OUTPUT_DIR, "summary.json"),
  JSON.stringify(summary, null, 2),
);

createPdf(summary);

fs.writeFileSync(
  path.join(OUTPUT_DIR, "email-subject.txt"),
  createSubject(summary),
);

console.log("Report generation completed successfully");