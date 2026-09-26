import { test, expect } from "../../fixtures/apiFixture";
import { ApiResult } from "../../models/ApiResult";
import { GetBookingResponse } from "../../models/Responses";
import {
  verifyStatusCode,
  verifyResponseContains,
} from "../../helpers/apiAssertions";
import { validateContract } from "../../helpers/contractValidator";
import { getBookingContract } from "../../src/contracts/booking/getBooking.contract";
import { errorResponseSchema } from "../../src/schemas/errorResponse.schema";

test.describe("Booking API - Get Booking", () => {
  test("Get booking details by ID", async ({ bookingApi }) => {
    const bookingId = 1;

    let result: ApiResult<GetBookingResponse>;
    let booking: GetBookingResponse;

    await test.step("Send GET request to retrieve booking", async () => {
      result = await bookingApi.getBooking(bookingId);

      verifyStatusCode(result.status, 200);
      expect(result.ok).toBeTruthy();

      // Contract Validation
      validateContract(result, getBookingContract);

      booking = result.body;

      console.log(`Retrieved Booking ID: ${bookingId}`);
      console.log("Response Status:", result.status);
      console.log("Response Headers:", result.response.headers());
      console.log("Response Body:", JSON.stringify(booking, null, 2));
    });

    await test.step("Validate booking response fields", async () => {
      verifyResponseContains(booking, "firstname");
      verifyResponseContains(booking, "lastname");
      verifyResponseContains(booking, "bookingdates");

      expect(booking.bookingdates).toHaveProperty("checkin");
      expect(booking.bookingdates).toHaveProperty("checkout");
    });
  });

  test("Get booking with invalid ID", async ({ bookingApi }) => {
    const invalidBookingId = 99999999;

    let result: ApiResult<GetBookingResponse>;

    await test.step("Request booking with invalid ID", async () => {
      result = await bookingApi.getBooking(invalidBookingId, {
        expectedStatus: 404,
        responseSchema:errorResponseSchema,
      });

      verifyStatusCode(result.status, 404);
      expect(result.body).toBeTruthy();

      console.log("Invalid Booking Response:", result.body);
    });
  });
});
