export const bookingRequestSchema = {
  type: "object",

  required: ["firstname", "lastname", "totalprice", "bookingdates"],

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

    bookingdates: {
      type: "object",
      required: ["checkin", "checkout"],
    },
  },
};
