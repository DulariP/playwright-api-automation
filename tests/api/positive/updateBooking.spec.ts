import { expect, test } from "../../../fixtures/apiFixture";
import {
  generateBookingData,
  generateName,
} from "../../../test-data/bookingData";
import {
  verifyStatusCode,
  verifyResponseContains,
  verifyBooking,
} from "../../../helpers/apiAssertions";

test.describe("Booking API - Complete CRUD Lifecycle", () => {
  test("Create, Update, Patch and Delete booking flow", async ({
    bookingApi,
  }) => {
    const originalBooking = generateBookingData();
    const updatedBooking = generateBookingData();
    const patchData = generateName();

    let bookingId: number;

    await test.step("Create booking", async () => {
      const createResult = await bookingApi.createBooking(originalBooking);
      verifyStatusCode(createResult.status, 200);
      verifyResponseContains(createResult.body, "bookingid");
      bookingId = createResult.body.bookingid;
      console.log(`Created Booking ID: ${bookingId}`);
      verifyBooking(createResult.body.booking, originalBooking);
    });

    await test.step("Update booking using PUT", async () => {
      const updateResult = await bookingApi.updateBooking(
        bookingId,
        updatedBooking,
      );
      verifyStatusCode(updateResult.status, 200);
      verifyBooking(updateResult.body, updatedBooking);
    });

    await test.step("Verify updated booking using GET", async () => {
      const getResult = await bookingApi.getBooking(bookingId);
      verifyStatusCode(getResult.status, 200);
      verifyBooking(getResult.body, updatedBooking);
    });

    await test.step("Partial update booking using PATCH", async () => {
      const patchResult = await bookingApi.partialUpdateBooking(
        bookingId,
        patchData,
      );
      verifyStatusCode(patchResult.status, 200);
      expect(patchResult.body.firstname).toBe(patchData.firstname);
      expect(patchResult.body.lastname).toBe(patchData.lastname);
    });

    await test.step("Verify PATCH changes are persisted", async () => {
      const getPatchResult = await bookingApi.getBooking(bookingId);
      verifyStatusCode(getPatchResult.status, 200);
      const retrievedBooking = getPatchResult.body;
      expect(retrievedBooking.firstname).toBe(patchData.firstname);
      expect(retrievedBooking.lastname).toBe(patchData.lastname);
      expect(retrievedBooking.totalprice).toBe(updatedBooking.totalprice);
      expect(retrievedBooking.depositpaid).toBe(updatedBooking.depositpaid);
      expect(retrievedBooking.bookingdates).toEqual(
        updatedBooking.bookingdates,
      );
      expect(retrievedBooking.additionalneeds).toBe(
        updatedBooking.additionalneeds,
      );
    });

    await test.step("Delete booking", async () => {
      const deleteResult = await bookingApi.deleteBooking(bookingId);
      verifyStatusCode(deleteResult.status, 201);
    });

    await test.step("Verify deleted booking cannot be retrieved", async () => {
      const deletedResult = await bookingApi.getBooking(bookingId, {
        expectedStatus: 404,
      });
      verifyStatusCode(deletedResult.status, 404);
    });
  });
});
