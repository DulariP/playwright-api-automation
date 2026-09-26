export const authResponseSchema = {
  type: "object",

  additionalProperties: false,

  required: ["token"],

  properties: {
    token: {
      type: "string",
    },
  },
};
