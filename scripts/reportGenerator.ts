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

const REPORT_DIR = path.join(process.cwd(), "reports");

const OUTPUT_DIR = path.join(process.cwd(), "reports");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, {
    recursive: true,
  });
}

/**
 * Find JSON Playwright reports recursively
 *
 * Expected structure:
 *
 * reports/
 *   smoke/
 *       smoke-report.json
 *   regression/
 *       regression-report.json
 *   qa/
 *       qa-report.json
 *   staging/
 *       staging-report.json
 */
function getReportFiles(directory: string = REPORT_DIR): string[] {
  if (!fs.existsSync(directory)) {
    throw new Error("reports folder not found");
  }

  let files: string[] = [];

  fs.readdirSync(directory).forEach((file) => {
    const fullPath = path.join(directory, file);

    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files = files.concat(getReportFiles(fullPath));
    } else if (
      file.endsWith(".json") &&
      !["summary.json", "package-lock.json"].includes(file)
    ) {
      files.push(fullPath);
    }
  });

  return files;
}

function readReports() {
  const files = getReportFiles();

  if (files.length === 0) {
    throw new Error("No JSON reports found");
  }

  return files.map((filePath) => {
    const fileName = path.basename(filePath);

    const environment = fileName.replace("-report.json", "");

    return {
      environment,

      data: JSON.parse(fs.readFileSync(filePath, "utf-8")),
    };
  });
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
    if (!suite.specs) {
      return;
    }

    suite.specs.forEach((spec: any) => {
      spec.tests.forEach((test: any) => {
        summary.total++;

        const result = test.results?.[test.results.length - 1];

        if (!result) {
          summary.skipped++;
          return;
        }

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

  reports.forEach((report) => {
    console.log(`Processing ${report.environment}`);

    if (!report.data.suites) {
      console.log(`No suites found for ${report.environment}`);

      return;
    }

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

console.log(
  "Reports found:",
  reports.map((r) => r.environment),
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
