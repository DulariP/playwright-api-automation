export function validateRequiredFields(
  payload: Record<string, any>,
  fields: string[],
) {

  const missingFields = fields.filter(
    (field) =>
      payload[field] === undefined ||
      payload[field] === null ||
      payload[field] === "",
  );

  if (missingFields.length > 0) {

    throw new Error(
      `
===============================
REQUEST VALIDATION FAILED
===============================

Missing required fields:

${missingFields.join("\n")}

Payload:

${JSON.stringify(payload, null, 2)}

===============================
      `,
    );
  }
}