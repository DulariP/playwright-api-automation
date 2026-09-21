import dotenv from "dotenv";

const environment = process.env.TEST_ENV || "qa";

dotenv.config({
  path: `environments/${environment}.env`,
  override: false,
});

export const ENV = {
  BASE_URL: process.env.BASE_URL!,
  USERNAME: process.env.USERNAME!,
  PASSWORD: process.env.PASSWORD!,
};