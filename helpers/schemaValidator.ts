import Ajv from "ajv";
import addFormats from "ajv-formats";

const ajv = new Ajv({
  allErrors: true,
});

addFormats(ajv);

export function validateSchema(
  schema: object,
  data: unknown,
): void {

  const validate = ajv.compile(schema);

  const valid = validate(data);

  if (!valid) {
    console.error(validate.errors);

    throw new Error(
      `Schema validation failed:\n${ajv.errorsText(validate.errors)}`
    );
  }
}