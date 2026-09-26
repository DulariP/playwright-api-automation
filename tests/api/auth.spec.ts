import { test, expect } from "../../fixtures/apiFixture";
import { AuthFactory } from "../../src/factories/AuthFactory";
import { ApiResult } from "../../models/ApiResult";
import {
  AuthSuccessResponse,
  AuthErrorResponse,
} from "../../models/Responses";
import { validateContract } from "../../helpers/contractValidator";
import { authSuccessContract } from "../../src/contracts/auth/authSuccess.contract";
import { authErrorContract } from "../../src/contracts/auth/authError.contract";

test.describe("Authentication API", () => {

  test("Generate authentication token", async ({ authApi }) => {
    const authData = AuthFactory.validLogin();

    let result: ApiResult<AuthSuccessResponse>;

    await test.step("Prepare authentication credentials", async () => {
      expect(authData.username).toBeTruthy();
      expect(authData.password).toBeTruthy();
    });


    await test.step("Generate authentication token", async () => {
      result = await authApi.login<AuthSuccessResponse>(
        authData.username,
        authData.password
      );
    });


    await test.step("Validate authentication contract", async () => {
      validateContract(result, authSuccessContract);
    });


    await test.step("Verify generated token", async () => {
      console.log("Response Status:", result.status);

      console.log(
        "Response Body:",
        JSON.stringify(result.body, null, 2)
      );

      expect(result.body.token).toBeTruthy();
      expect(typeof result.body.token).toBe("string");
      expect(result.body.token.length).toBeGreaterThan(0);

      console.log("Token generated successfully");
    });

  });


  test("Login with invalid credentials", async ({ authApi }) => {
    const invalidAuthData = AuthFactory.invalidLogin();

    let result: ApiResult<AuthErrorResponse>;


    await test.step("Send login request with invalid credentials", async () => {

      result = await authApi.login<AuthErrorResponse>(
        invalidAuthData.username,
        invalidAuthData.password
      );

    });


    await test.step("Validate authentication error contract", async () => {
      validateContract(result, authErrorContract);
    });


    await test.step("Verify authentication failure response", async () => {

      console.log("Response Status:", result.status);

      console.log(
        "Response Body:",
        JSON.stringify(result.body, null, 2)
      );


      expect(result.status).toBe(200);

      expect(result.body.reason).toBe("Bad credentials");

    });

  });

});