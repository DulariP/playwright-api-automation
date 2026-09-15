import { test, expect } from "../../../fixtures/apiFixture";
import { generateBookingData } from "../../../test-data/bookingData";
import { verifyStatusCode } from "../../../helpers/apiAssertions";

test.describe("Booking API - Negative Update Tests", () => {
  test("Update booking without authentication", async ({ bookingApi }) => {
    const bookingId = 1;
    const updatePayload = generateBookingData();

    await test.step("Send update request without authentication", async () => {
      const result = await bookingApi.updateBookingWithoutAuth(
        bookingId,
        updatePayload,
        {
          expectedStatus: 403,
        },
      );
      verifyStatusCode(result.status, 403);
      expect(result.body).toContain("Forbidden");
    });
  });
});