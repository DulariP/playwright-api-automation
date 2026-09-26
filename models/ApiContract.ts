export interface ApiContract<T = unknown> {
  expectedStatus: number;

  responseSchema?: object;

  requiredHeaders?: Record<string, string>;
}
