export const authFailureResponseSchema = {
  type: "object",

  additionalProperties: false,

  required: ["reason"],

  properties: {
    reason: {
      type: "string",
    },
  },
};
