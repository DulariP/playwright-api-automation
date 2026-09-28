import { APIRequestContext, APIResponse } from "@playwright/test";
import { logRequest, logResponse } from "../helpers/logger";
import { ApiResult } from "../models/ApiResult";
import { AuthManager } from "../helpers/AuthManager";
import { throwApiError } from "../helpers/apiErrorHandler";
import { RequestOptions } from "../models/RequestOptions";
import { attachApiLog } from "../helpers/reportHelper";
import { validateSchema } from "../helpers/schemaValidator";

export class BaseApi {
  protected request: APIRequestContext;

  constructor(request: APIRequestContext) {
    this.request = request;
  }

  protected async getAuthHeaders() {
    const token = await AuthManager.getToken(this.request);

    return {
      Cookie: `token=${token}`,
      "Content-Type": "application/json",
    };
  }

  protected async parseResponse(response: APIResponse) {
    try {
      return await response.json();
    } catch {
      return await response.text();
    }
  }

  private async executeRequest<T>(
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    url: string,
    data?: object,
    options: RequestOptions = {},
    retry = true,
  ): Promise<ApiResult<T>> {
    const {
      requiresAuth = false,
      expectedStatus,
      requestSchema,
      responseSchema,
    } = options;

    let headers: Record<string, string> | undefined;

    if (requiresAuth) {
      headers = await this.getAuthHeaders();
    }

    // ===========================
    // Validate Request Payload
    // ===========================
    if (requestSchema && data) {
      validateSchema(requestSchema, data, "Request Payload");
    }

    logRequest(method, url, data);

    await attachApiLog("API Request", {
      method,
      url,
      body: data,
    });

    let response: APIResponse;

    switch (method) {
      case "GET":
        response = await this.request.get(url, {
          ...(headers && { headers }),
        });
        break;

      case "POST":
        response = await this.request.post(url, {
          data,
          ...(headers && { headers }),
        });
        break;

      case "PUT":
        response = await this.request.put(url, {
          data,
          ...(headers && { headers }),
        });
        break;

      case "PATCH":
        response = await this.request.patch(url, {
          data,
          ...(headers && { headers }),
        });
        break;

      case "DELETE":
        response = await this.request.delete(url, {
          ...(headers && { headers }),
        });
        break;
    }

    const body = await this.parseResponse(response);

    // ===========================
    // Validate Response Payload
    // ===========================
    if (responseSchema && response.ok()) {
      validateSchema(responseSchema, body, "Response Payload");
    }

    logResponse(response, body);

    await attachApiLog("API Response", {
      status: response.status(),
      body,
    });

    if (retry && response.status() === 401 && requiresAuth) {
      console.log("Token expired. Refreshing...");

      AuthManager.clearToken();

      return this.executeRequest<T>(method, url, data, options, false);
    }

    const isExpectedStatus =
      expectedStatus !== undefined && response.status() === expectedStatus;

    if (!response.ok() && !isExpectedStatus) {
      throwApiError({
        method,
        url,
        ...(expectedStatus !== undefined && {
          expectedStatus,
        }),
        status: response.status(),
        responseBody: body,
      });
    }

    return {
      response,
      body: body as T,
      status: response.status(),
      ok: response.ok(),
    };
  }

  protected async get<T>(
    url: string,
    options?: RequestOptions,
  ): Promise<ApiResult<T>> {
    return this.executeRequest<T>("GET", url, undefined, options);
  }

  protected async post<T>(
    url: string,
    data?: object,
    options?: RequestOptions,
  ): Promise<ApiResult<T>> {
    return this.executeRequest<T>("POST", url, data, options);
  }

  protected async put<T>(
    url: string,
    data?: object,
    options?: RequestOptions,
  ): Promise<ApiResult<T>> {
    return this.executeRequest<T>("PUT", url, data, {
      requiresAuth: true,
      ...options,
    });
  }

  protected async patch<T>(
    url: string,
    data?: object,
    options?: RequestOptions,
  ): Promise<ApiResult<T>> {
    return this.executeRequest<T>("PATCH", url, data, {
      requiresAuth: true,
      ...options,
    });
  }

  protected async delete<T>(
    url: string,
    options?: RequestOptions,
  ): Promise<ApiResult<T>> {
    return this.executeRequest<T>("DELETE", url, undefined, {
      requiresAuth: true,
      ...options,
    });
  }
}
