import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";

interface Summary {
  total: number;

  passed: number;

  failed: number;

  skipped: number;

  failures: {
    title: string;
    reason: string;
    environment: string;
  }[];
}

const REPORT_DIR = path.join(process.cwd(), "combined-results");

const OUTPUT_DIR = path.join(process.cwd(), "reports");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, {
    recursive: true,
  });
}

function getReportFiles(): string[] {
  if (!fs.existsSync(REPORT_DIR)) {
    throw new Error("combined-results folder not found");
  }

  return fs.readdirSync(REPORT_DIR).filter((file) => file.endsWith(".json"));
}

function readReports() {
  const files = getReportFiles();

  if (files.length === 0) {
    throw new Error("No JSON reports found");
  }

  return files.map((file) => ({
    environment: file.replace("-report.json", ""),

    data: JSON.parse(fs.readFileSync(path.join(REPORT_DIR, file), "utf-8")),
  }));
}

function analyseTests(reports: any[]): Summary {
  const summary: Summary = {
    total: 0,

    passed: 0,

    failed: 0,

    skipped: 0,

    failures: [],
  };

  function processSuite(suite: any, environment: string) {
    if (suite.specs) {
      suite.specs.forEach((spec: any) => {
        spec.tests.forEach((test: any) => {
          summary.total++;

          const result = test.results[test.results.length - 1];

          if (result.status === "passed") {
            summary.passed++;
          } else if (result.status === "failed") {
            summary.failed++;

            summary.failures.push({
              title: spec.title,

              reason: result.error?.message || "Unknown error",

              environment,
            });
          } else {
            summary.skipped++;
          }
        });
      });
    }

    if (suite.suites) {
      suite.suites.forEach((child: any) => processSuite(child, environment));
    }
  }

  reports.forEach((report) => {
    report.data.suites.forEach((suite: any) =>
      processSuite(suite, report.environment),
    );
  });

  return summary;
}

function createEmailBody(summary: Summary) {
  const status = summary.failed > 0 ? "FAILED" : "PASSED";

  let body = `

Playwright API Automation Report

=================================

Execution Status:
${status}


Test Summary
=================================

Total Tests : ${summary.total}

Passed      : ${summary.passed}

Failed      : ${summary.failed}

Skipped     : ${summary.skipped}



`;

  if (summary.failed > 0) {
    body += `

Failed Tests

=================================

`;

    summary.failures.forEach((failure, index) => {
      body += `

${index + 1}. ${failure.title}

Environment:
${failure.environment}

Reason:

${failure.reason}


`;
    });
  }

  body += `

Reports
=================================

GitHub Pages:

https://dularip.github.io/playwright-api-automation/


`;

  return body;
}

function createPdf(summary: Summary) {
  const pdfPath = path.join(OUTPUT_DIR, "API_Test_Report.pdf");

  const doc = new PDFDocument();

  doc.pipe(fs.createWriteStream(pdfPath));

  doc.fontSize(18).text("Playwright API Automation Report");

  doc.moveDown();

  doc.fontSize(12).text(
    `
Total Tests : ${summary.total}

Passed      : ${summary.passed}

Failed      : ${summary.failed}

Skipped     : ${summary.skipped}
`,
  );

  if (summary.failed > 0) {
    doc.moveDown();

    doc.text("Failed Tests");

    summary.failures.forEach((failure, index) => {
      doc.moveDown();

      doc.text(
        `
${index + 1}. ${failure.title}

Environment:
${failure.environment}

Reason:
${failure.reason}
`,
      );
    });
  }

  doc.end();

  console.log(`PDF created: ${pdfPath}`);
}

function createSubject(summary: Summary) {
  if (summary.failed > 0) {
    return `❌ API Automation Pipeline FAILED | ${summary.failed} Failed`;
  }

  return `✅ API Automation Pipeline PASSED | ${summary.passed} Passed`;
}

// MAIN EXECUTION

const reports = readReports();

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
