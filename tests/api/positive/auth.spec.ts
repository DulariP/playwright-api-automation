import { test, expect } from "../../../fixtures/apiFixture";
import { getAuthData } from "../../../test-data/authData";

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
});
