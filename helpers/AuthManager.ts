import { APIRequestContext } from "@playwright/test";
import { TokenInfo } from "../models/TokenInfo";
import { AuthResponse } from "../models/Responses";
import { API_ENDPOINTS } from "../constants/apiEndpoints";
import { AuthFactory } from "../src/factories/AuthFactory";

export class AuthManager {
  private static tokenInfo: TokenInfo | null = null;

  private static readonly TOKEN_EXPIRY = 30 * 60 * 1000; // 30 minutes

  static async getToken(request: APIRequestContext): Promise<string> {
    if (this.tokenInfo && !this.isExpired()) {
      console.log("♻️ Using cached authentication token");

      return this.tokenInfo.token;
    }

    console.log("🔑 Generating new authentication token");

    const authData = AuthFactory.validLogin();

    const response = await request.post(API_ENDPOINTS.AUTH, {
      data: authData,
    });

    if (!response.ok()) {
      throw new Error(`Authentication failed: ${response.status()}`);
    }

    const body = (await response.json()) as AuthResponse;

    if (!body.token) {
      throw new Error("Token was not returned from authentication API");
    }

    const now = Date.now();

    this.tokenInfo = {
      token: body.token,

      generatedAt: now,

      expiresAt: now + this.TOKEN_EXPIRY,
    };

    return body.token;
  }

  private static isExpired(): boolean {
    if (!this.tokenInfo) {
      return true;
    }

    return Date.now() > this.tokenInfo.expiresAt;
  }

  static clearToken(): void {
    this.tokenInfo = null;
  }
}
