import { test, expect } from "../../../fixtures/apiFixture";
import { AuthResponse } from "../../../models/Responses";
import { ApiResult } from "../../../models/ApiResult";

test.describe("Authentication API - Negative Tests", () => {
  test("Login with invalid credentials", async ({ authApi }) => {
    const invalidAuthData = {
      username: "invalid_user",
      password: "wrong_password",
    };

    let result: ApiResult<AuthResponse>;

    await test.step("Send login request with invalid credentials", async () => {
      result = await authApi.login(
        invalidAuthData.username,
        invalidAuthData.password,
      );
    });

    await test.step("Verify authentication failure response", async () => {
      console.log("Response Status:", result.status);
      console.log("Response Body:", JSON.stringify(result.body, null, 2));
      expect(result.body).toHaveProperty("reason");
      expect(result.body.reason).toBe("Bad credentials");
      expect(result.body.token).toBeUndefined();
    });
  });
});
