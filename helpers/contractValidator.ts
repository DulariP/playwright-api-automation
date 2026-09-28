import Ajv from "ajv";
import { ApiContract } from "../models/ApiContract";

const ajv = new Ajv({
  allErrors: true,
});

export function validateContract(result: any, contract: ApiContract) {
  if (result.status !== contract.expectedStatus) {
    throw new Error(
      `Expected status ${contract.expectedStatus} but received ${result.status}`,
    );
  }

  if (contract.responseSchema) {
    const validate = ajv.compile(contract.responseSchema);

    const valid = validate(result.body);

    if (!valid) {
      throw new Error(
        `Contract validation failed: ${JSON.stringify(validate.errors)}`,
      );
    }
  }
if (contract.requiredHeaders) {

  const headers = result.response.headers();

  for (const [key, value] of Object.entries(contract.requiredHeaders)) {

    const actualValue = headers[key];

    if (!actualValue?.includes(value)) {
      throw new Error(
        `Missing required header ${key}. Expected ${value}, Received ${actualValue}`
      );
    }
  }
}
}
