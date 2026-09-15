import { Auth } from "../models/Auth";

export function getAuthData(): Auth {
  return {
    username: process.env.BOOKER_USERNAME!,
    password: process.env.BOOKER_PASSWORD!,
  };
}