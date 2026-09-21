import dotenv from "dotenv";

const environment = process.env.TEST_ENV || "qa";

const result = dotenv.config({
  path: `environments/${environment}.env`,
  override: false,
});

console.log("ENV FILE:", `environments/${environment}.env`);
console.log("DOTENV RESULT:", result);
console.log("BASE_URL AFTER DOTENV:", process.env.BASE_URL);

export const ENV = {
  BASE_URL: process.env.BASE_URL!,
  USERNAME: process.env.USERNAME!,
  PASSWORD: process.env.PASSWORD!,
};

console.log("FINAL ENV:", ENV);