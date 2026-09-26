import { expect, test } from "../../fixtures/apiFixture";
import { ApiResult } from "../../models/ApiResult";
import {
  CreateBookingResponse,
  GetBookingResponse,
  UpdateBookingResponse,
} from "../../models/Responses";
import { BookingFactory } from "../../src/factories/BookingFactory";
import {
  verifyStatusCode,
  verifyResponseContains,
  verifyBooking,
} from "../../helpers/apiAssertions";
import { validateContract } from "../../helpers/contractValidator";
import { createBookingContract } from "../../src/contracts/booking/createBooking.contract";
import { updateBookingContract } from "../../src/contracts/booking/updateBooking.contract";
import { getBookingContract } from "../../src/contracts/booking/getBooking.contract";
import { patchBookingContract } from "../../src/contracts/booking/patchBooking.contract";
import { deleteBookingContract } from "../../src/contracts/booking/deleteBooking.contract";
import { errorResponseSchema } from "../../src/schemas/errorResponse.schema";

test.describe("Booking API - Complete CRUD Lifecycle", () => {
  test("Create, Update, Patch and Delete booking flow", async ({
    bookingApi,
  }) => {
    const originalBooking = BookingFactory.create();
    const updatedBooking = BookingFactory.create();
    const patchData = BookingFactory.createPatchData();

    let bookingId: number;

    await test.step("Create booking", async () => {
      const createResult: ApiResult<CreateBookingResponse> =
        await bookingApi.createBooking(originalBooking);

      verifyStatusCode(createResult.status, 200);
      validateContract(createResult, createBookingContract);
      verifyResponseContains(createResult.body, "bookingid");

      bookingId = createResult.body.bookingid;

      verifyBooking(createResult.body.booking, originalBooking);
      console.log(`Created Booking ID: ${bookingId}`);
    });

    await test.step("Update booking using PUT", async () => {
      const updateResult: ApiResult<UpdateBookingResponse> =
        await bookingApi.updateBooking(bookingId, updatedBooking);

      verifyStatusCode(updateResult.status, 200);
      validateContract(updateResult, updateBookingContract);
      verifyBooking(updateResult.body, updatedBooking);
    });

    await test.step("Verify updated booking using GET", async () => {
      const getResult: ApiResult<GetBookingResponse> =
        await bookingApi.getBooking(bookingId);

      verifyStatusCode(getResult.status, 200);
      validateContract(getResult, getBookingContract);
      verifyBooking(getResult.body, updatedBooking);
    });

    await test.step("Partial update booking using PATCH", async () => {
      const patchResult = await bookingApi.partialUpdateBooking(
        bookingId,
        patchData,
      );

      verifyStatusCode(patchResult.status, 200);
      validateContract(patchResult, patchBookingContract);
      expect(patchResult.body.firstname).toBe(patchData.firstname);
      expect(patchResult.body.lastname).toBe(patchData.lastname);
    });

    await test.step("Verify PATCH changes are persisted", async () => {
      const result = await bookingApi.getBooking(bookingId);

      verifyStatusCode(result.status, 200);
      const booking = result.body;
      expect(booking.firstname).toBe(patchData.firstname);
      expect(booking.lastname).toBe(patchData.lastname);
      expect(booking.totalprice).toBe(updatedBooking.totalprice);
      expect(booking.depositpaid).toBe(updatedBooking.depositpaid);
      expect(booking.bookingdates).toEqual(updatedBooking.bookingdates);
      expect(booking.additionalneeds).toBe(updatedBooking.additionalneeds);
    });

    await test.step("Delete booking", async () => {
      const deleteResult = await bookingApi.deleteBooking(bookingId);

      verifyStatusCode(deleteResult.status, 201);
      validateContract(deleteResult, deleteBookingContract);
    });

    await test.step("Verify deleted booking cannot be retrieved", async () => {
      const deletedResult = await bookingApi.getBooking(bookingId, {
        expectedStatus: 404,
        responseSchema: errorResponseSchema,
      });
      verifyStatusCode(deletedResult.status, 404);
    });
  });

  test("Update booking without authentication", async ({ bookingApi }) => {
    const bookingId = 1;
    const updatePayload = BookingFactory.create();
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
