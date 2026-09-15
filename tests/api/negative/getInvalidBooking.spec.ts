import { test, expect } from "../../../fixtures/apiFixture";
import { verifyStatusCode } from "../../../helpers/apiAssertions";

test.describe("Booking API - Negative GET Tests", () => {
  test("Get booking with invalid ID", async ({ bookingApi }) => {
    const invalidBookingId = 99999999;

    await test.step("Request booking with invalid ID", async () => {
      const result = await bookingApi.getBooking(invalidBookingId, {
        expectedStatus: 404,
      });

      verifyStatusCode(result.status, 404);
      expect(result.body).toBeTruthy();
      console.log("Invalid Booking Response:", result.body);
    });
  });
});
