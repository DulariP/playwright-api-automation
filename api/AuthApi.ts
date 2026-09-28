import { BaseApi } from "./BaseApi";
import { API_ENDPOINTS } from "../constants/apiEndpoints";
import { Auth } from "../models/Auth";
import { AuthSuccessResponse } from "../models/Responses";
import { RequestOptions } from "../models/RequestOptions";
import { authRequestSchema } from "../src/schemas/authRequest.schema";
import { authResponseSchema } from "../src/schemas/authResponse.schema";

export class AuthApi extends BaseApi {
  async getToken(
    auth: Auth,
    options?: RequestOptions,
  ): Promise<string> {
    const result = await this.login<AuthSuccessResponse>(
      auth.username,
      auth.password,
      {
        responseSchema: authResponseSchema,
        ...options,
      },
    );

    if (!result.response.ok()) {
      throw new Error(
        `Authentication failed. Status: ${result.response.status()}`,
      );
    }

    return result.body.token;
  }

  async login<T>(
    username: string,
    password: string,
    options?: RequestOptions,
  ) {
    return this.post<T>(
      API_ENDPOINTS.AUTH,
      {
        username,
        password,
      },
      {
        requestSchema: authRequestSchema,
        ...options,
      },
    );
  }
}