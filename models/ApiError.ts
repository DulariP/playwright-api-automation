export interface ApiError {
  method: string;
  url: string;
  expectedStatus?: number;
  status: number;
  responseBody: unknown;
}
