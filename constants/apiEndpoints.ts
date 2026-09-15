import { ENV } from "../config/envConfig";

export const API_ENDPOINTS = {
  AUTH: `${ENV.BASE_URL}/auth`,
  BOOKING: `${ENV.BASE_URL}/booking`,
};
