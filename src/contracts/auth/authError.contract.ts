import { ApiContract } from "../../../models/ApiContract";
import { errorResponseSchema } from "../../schemas/errorResponse.schema";

export const authErrorContract: ApiContract = {
  expectedStatus: 200,

  responseSchema: errorResponseSchema,

  requiredHeaders: {
    "content-type": "application/json",
  },
};