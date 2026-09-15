import { ApiError } from "../models/ApiError";

export function throwApiError(error: ApiError): never {
  throw new Error(`
======================================
API REQUEST FAILED
======================================

Method:
${error.method}

URL:
${error.url}

Expected Status:
${error.expectedStatus ?? "Not Specified"}

Actual Status:
${error.status}

Response Body:
${JSON.stringify(error.responseBody, null, 2)}

======================================
`);
}
