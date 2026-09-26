export const updateBookingResponseSchema = {
  type: "object",

  additionalProperties: false,

  required: [
    "firstname",
    "lastname",
    "totalprice",
    "depositpaid",
    "bookingdates",
    "additionalneeds",
  ],

  properties: {
    firstname: {
      type: "string",
    },

    lastname: {
      type: "string",
    },

    totalprice: {
      type: "number",
    },

    depositpaid: {
      type: "boolean",
    },

    bookingdates: {
      type: "object",

      required: ["checkin", "checkout"],

      properties: {
        checkin: {
          type: "string",
        },

        checkout: {
          type: "string",
        },
      },
    },

    additionalneeds: {
      type: "string",
    },
  },
};
