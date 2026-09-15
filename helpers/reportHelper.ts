import { test } from "@playwright/test";

export async function attachApiLog(name: string, data: unknown) {
  await test.info().attach(name, {
    body: JSON.stringify(data, null, 2),
    contentType: "application/json",
  });
}
