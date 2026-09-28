export const patchBookingRequestSchema = {
  type: "object",

  additionalProperties: false,

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

      additionalProperties: false,

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