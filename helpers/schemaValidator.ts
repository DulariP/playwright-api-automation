import Ajv from "ajv";
import addFormats from "ajv-formats";

const ajv = new Ajv({
  allErrors: true,
  strict: false,
});

addFormats(ajv);

export function validateSchema(
  schema: object,
  data: unknown,
  schemaName: string,
) {
  const validate = ajv.compile(schema);

  const valid = validate(data);

  if (!valid) {
    console.error(`${schemaName} validation failed`);

    console.error(validate.errors);

    throw new Error(
      `${schemaName} validation failed: ${JSON.stringify(validate.errors)}`,
    );
  }

  console.log(`${schemaName} validation passed`);
}
