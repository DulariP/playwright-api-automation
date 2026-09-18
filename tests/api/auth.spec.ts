import { test, expect } from "../../fixtures/apiFixture";
import { getAuthData } from "../../test-data/authData";
import { ApiResult } from "../../models/ApiResult";
import { AuthResponse } from "../../models/Responses";

test.describe("Authentication API", () => {
  test("Generate authentication token", async ({ authApi }) => {
    const authData = getAuthData();
    let token: string;

    await test.step("Prepare authentication credentials", async () => {
      expect(authData.username).toBeTruthy();
      expect(authData.password).toBeTruthy();
    }); 

    await test.step("Generate authentication token", async () => {
      token = await authApi.getToken(authData);
      expect(token).toBeTruthy();
    });

    await test.step("Verify generated token", async () => {
      console.log("Token generated successfully");
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(0);
    });
  });

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
