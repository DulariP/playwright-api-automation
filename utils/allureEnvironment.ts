import fs from "fs";
import path from "path";

export function createAllureEnvironment() {
  const environment = process.env.TEST_ENV || "qa";

  const allureResultsPath = path.join(
    process.cwd(),
    "allure-results"
  );

  if (!fs.existsSync(allureResultsPath)) {
    fs.mkdirSync(allureResultsPath);
  }

  const content = 
`Environment=${environment}
Base_URL=${process.env.BASE_URL}
`;

  fs.writeFileSync(
    path.join(allureResultsPath, "environment.properties"),
    content
  );
}