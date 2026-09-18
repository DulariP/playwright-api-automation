import { test, expect } from "../../fixtures/apiFixture";
import { GetBookingResponse } from "../../models/Responses";
import {
  verifyStatusCode,
  verifyResponseContains,
} from "../../helpers/apiAssertions";

test.describe("Booking API - Get Booking", () => {
  /*
  test("Get booking details by ID", async ({ bookingApi }) => {
    const bookingId = 1;

    let booking: GetBookingResponse;

    await test.step("Send GET request to retrieve booking", async () => {
      const getResult = await bookingApi.getBooking(bookingId);
      verifyStatusCode(getResult.status, 200);
      expect(getResult.ok).toBeTruthy();
      booking = getResult.body;
      console.log(`Retrieved Booking ID: ${bookingId}`);
      console.log("Response Status:", getResult.status);
      console.log("Response Headers:", getResult.response.headers());
      console.log("Response Body:", JSON.stringify(booking, null, 2));
    });

    await test.step("Validate booking response fields", async () => {
      verifyResponseContains(booking, "firstname");
      verifyResponseContains(booking, "lastname");
      verifyResponseContains(booking, "bookingdates");
      expect(booking.bookingdates).toHaveProperty("checkin");
      expect(booking.bookingdates).toHaveProperty("checkout");
    });
  });*/

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
