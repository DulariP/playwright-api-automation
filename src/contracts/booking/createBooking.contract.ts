import { ApiContract } from "../../../models/ApiContract";
import { bookingCreateResponseSchema } from "../../schemas/bookingCreateResponse.schema";

export const createBookingContract: ApiContract = {
  expectedStatus: 200,

  responseSchema: bookingCreateResponseSchema,

  requiredHeaders: {
    "content-type": "application/json",
  },
};
