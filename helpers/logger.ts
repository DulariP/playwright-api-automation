export function logRequest(method: string, url: string, body?: unknown) {
  console.log("\n========== API REQUEST ==========");
  console.log(`Method : ${method}`);
  console.log(`URL    : ${url}`);

  if (body !== undefined) {
    console.log("Body:");
    console.dir(body, { depth: null });
  }
  console.log("=================================\n");
}

export function logResponse(response: any, body?: unknown) {
  console.log("\n========== API RESPONSE ==========");
  console.log(`Status : ${response.status()}`);

  if (body !== undefined) {
    console.log("Body:");
    console.dir(body, { depth: null });
  }
  console.log("==================================\n");
}
