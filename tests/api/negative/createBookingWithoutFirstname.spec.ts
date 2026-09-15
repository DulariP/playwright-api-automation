import { test, expect } from "../../../fixtures/apiFixture";

test.describe("Booking API - Negative Create Booking Tests", () => {
  test("Create booking without firstname", async ({ bookingApi }) => {
    const invalidBooking = {
      firstname: "",
      lastname: "Test",
      totalprice: 100,
      depositpaid: true,
      bookingdates: {
        checkin: "2027-01-01",

        checkout: "2027-01-05",
      },
      additionalneeds: "Breakfast",
    };

    await test.step("Send create booking request without firstname", async () => {
      const result = await bookingApi.createBooking(invalidBooking, {
        expectedStatus: 400,
      });

      console.log("Response Status:", result.status);
      console.log("Response Body:", JSON.stringify(result.body, null, 2));
      expect(result.ok).toBeFalsy();
      expect(result.status).toBeGreaterThanOrEqual(400);
    });
  });
});
// the Restful Booker API does not validate required fields. It accepts an empty string and creates the booking.
// so the test failed
