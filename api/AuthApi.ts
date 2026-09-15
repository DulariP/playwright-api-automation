import { BaseApi } from "./BaseApi";
import { API_ENDPOINTS } from "../constants/apiEndpoints";
import { Auth } from "../models/Auth";
import { AuthResponse } from "../models/Responses";

export class AuthApi extends BaseApi {
  async getToken(auth: Auth): Promise<string> {
    const { response, body } = await this.post<AuthResponse>(
      API_ENDPOINTS.AUTH,
      auth,
    );

    if (!response.ok()) { 
      throw new Error(`Authentication failed. Status: ${response.status()}`);
    }

    if (!body.token) {
      throw new Error("Token was not returned from authentication API");
    }

    return body.token;
  }

  async login(username: string, password: string) {
    return this.post<AuthResponse>(API_ENDPOINTS.AUTH, {
      username,
      password,
    });
  }
}
