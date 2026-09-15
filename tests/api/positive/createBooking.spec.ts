import { test, expect } from "../../../fixtures/apiFixture";
import { generateBookingData } from "../../../test-data/bookingData";
import {
  verifyStatusCode,
  verifyResponseContains,
  verifyBooking,
} from "../../../helpers/apiAssertions";
import { validateBookingPayload } from "../../../helpers/bookingValidator";

test.describe("Booking API - Create Booking", () => {
  test("Create booking and verify details", async ({ bookingApi }) => {
    const bookingData = generateBookingData();

    await test.step("Validate booking request payload", async () => {
      validateBookingPayload(bookingData);
    });

    let bookingId: number;

    await test.step("Create new booking", async () => {
      const createResult = await bookingApi.createBooking(bookingData);
      verifyStatusCode(createResult.status, 200);
      expect(createResult.ok).toBeTruthy();
      const createdBooking = createResult.body;
      verifyResponseContains(createdBooking, "bookingid");
      expect(createdBooking.bookingid).toBeDefined();
      bookingId = createdBooking.bookingid;
      console.log(`Created Booking ID: ${bookingId}`);
      verifyBooking(createdBooking.booking, bookingData);
    });

    await test.step("Verify created booking using GET", async () => {
      const getResult = await bookingApi.getBooking(bookingId);
      verifyStatusCode(getResult.status, 200);
      expect(getResult.ok).toBeTruthy();
      verifyBooking(getResult.body, bookingData);
    });
  });
});
