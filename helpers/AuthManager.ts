import { APIRequestContext } from "@playwright/test";
import { getAuthData } from "../test-data/authData";
import { TokenInfo } from "../models/TokenInfo";
import { AuthResponse } from "../models/Responses";
import { API_ENDPOINTS } from "../constants/apiEndpoints";

export class AuthManager {
  private static tokenInfo: TokenInfo | null = null;
  private static readonly TOKEN_EXPIRY = 30 * 60 * 1000; // 30 minutes

  static async getToken(request: APIRequestContext): Promise<string> {
    if (this.tokenInfo && !this.isExpired()) {
      console.log("♻️ Using cached authentication token");
      return this.tokenInfo.token;
    }

    console.log("🔑 Generating new authentication token");
    const response = await request.post(API_ENDPOINTS.AUTH, {
      data: getAuthData(),
    });

    if (!response.ok()) {
      throw new Error(`Authentication failed: ${response.status()}`);
    }

    const body = (await response.json()) as AuthResponse;
    const token = body.token;

    if (!token) {
      throw new Error("Token was not returned from authentication API");
    }

    this.tokenInfo = {
      token,
      generatedAt: Date.now(),
      expiresAt: Date.now() + this.TOKEN_EXPIRY,
    };
    return token;
  }

  private static isExpired(): boolean {
    if (!this.tokenInfo) {
      return true;
    }
    return Date.now() > this.tokenInfo.expiresAt;
  }

  static clearToken() {
    this.tokenInfo = null;
  }
}
