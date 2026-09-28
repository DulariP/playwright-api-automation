export const errorResponseSchema = {
  type: "object",

  additionalProperties: false,

  required: ["reason"],

  properties: {
    reason: {
      type: "string",
    },
  },
};
