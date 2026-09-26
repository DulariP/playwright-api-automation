import { ApiContract } from "../../../models/ApiContract";
import { bookingSchema } from "../../schemas/booking.schema";

export const patchBookingContract: ApiContract = {
  expectedStatus: 200,

  responseSchema: bookingSchema,

  requiredHeaders: {
    "content-type": "application/json",
  },
};