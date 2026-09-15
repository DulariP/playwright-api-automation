import dotenv from "dotenv";

const environment = process.env.ENV || "qa";

dotenv.config({
  path: `.env.${environment}`,
});

export const ENV = {
  BASE_URL: process.env.BASE_URL!,
  USERNAME: process.env.USERNAME!,
  PASSWORD: process.env.PASSWORD!,
};
