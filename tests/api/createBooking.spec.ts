import { test, expect } from "../../fixtures/apiFixture";
import { ApiResult } from "../../models/ApiResult";
import { CreateBookingResponse } from "../../models/Responses";
import { BookingFactory } from "../../src/factories/BookingFactory";
import {
  verifyStatusCode,
  verifyResponseContains,
  verifyBooking,
} from "../../helpers/apiAssertions";
import { validateBookingPayload } from "../../helpers/bookingValidator";
import { validateContract } from "../../helpers/contractValidator";
import { createBookingContract } from "../../src/contracts/booking/createBooking.contract";

test.describe("Booking API - Create Booking", () => {
  test("Create booking and verify details", async ({ bookingApi }) => {
    const bookingData = BookingFactory.create();

    let bookingId: number;
    let createResult: ApiResult<CreateBookingResponse>;

    await test.step("Validate booking request payload", async () => {
      validateBookingPayload(bookingData);
    });

    await test.step("Create new booking", async () => {
      createResult = await bookingApi.createBooking(bookingData);

      verifyStatusCode(createResult.status, 200);
      expect(createResult.ok).toBeTruthy();

      // Contract Validation
      validateContract(createResult, createBookingContract);

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

  test("Should fail when total price is not a number", async ({
    bookingApi,
  }) => {
    const invalidBooking = BookingFactory.invalidPrice();

    await expect(bookingApi.createBooking(invalidBooking)).rejects.toThrow(
      "Request Payload validation failed",
    );
  });

  test("Should fail when depositpaid is invalid", async ({ bookingApi }) => {
    const invalidBooking = BookingFactory.invalidDepositPaid();

    await expect(bookingApi.createBooking(invalidBooking)).rejects.toThrow(
      "Request Payload validation failed",
    );
  });

  test("Should fail when payload contains unknown fields", async ({
    bookingApi,
  }) => {
    const invalidBooking = BookingFactory.withExtraField();

    await expect(bookingApi.createBooking(invalidBooking)).rejects.toThrow(
      "Request Payload validation failed",
    );
  });
});
