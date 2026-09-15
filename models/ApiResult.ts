import { APIResponse } from "@playwright/test";

export interface ApiResult<T> {
  response: APIResponse;
  body: T;
  status: number;
  ok: boolean;
}
