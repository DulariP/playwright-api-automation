import { ApiContract } from "../../../models/ApiContract";
import { authResponseSchema } from "../../schemas/authResponse.schema";

export const authSuccessContract: ApiContract = {
  expectedStatus: 200,

  responseSchema: authResponseSchema,

  requiredHeaders: {
    "content-type": "application/json",
  },
};