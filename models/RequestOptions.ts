export interface RequestOptions {
  requiresAuth?: boolean;
  expectedStatus?: number;

  requestSchema?: object;
  responseSchema?: object;
}
