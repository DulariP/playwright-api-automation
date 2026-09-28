import { bookingSchema } from "./booking.schema";

export const bookingCreateResponseSchema = {
  type: "object",

  additionalProperties: false,

  required: ["bookingid", "booking"],

  properties: {
    bookingid: {
      type: "number",
    },

    booking: bookingSchema,
  },
} as const;
