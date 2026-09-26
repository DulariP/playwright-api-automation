export interface ApiContract {
  expectedStatus: number;
  responseSchema?: object;
  requiredHeaders?: Record<string, string>;
}
