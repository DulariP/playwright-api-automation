import { Auth } from "../models/Auth";

export function getAuthData(): Auth {
  return {
    username: process.env.USERNAME!,
    password: process.env.PASSWORD!,
  };
}