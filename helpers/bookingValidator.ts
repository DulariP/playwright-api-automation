import { Booking } from "../models/Booking";
import { validateRequiredFields } from "./requestValidator";

export function validateBookingPayload(booking: Booking) {
  validateRequiredFields(booking, [
    "firstname",
    "lastname",
    "totalprice",
    "depositpaid",
    "bookingdates",
  ]);

  if (!booking.bookingdates.checkin) {
    throw new Error("Booking validation failed: checkin date is required");
  }

  if (!booking.bookingdates.checkout) {
    throw new Error("Booking validation failed: checkout date is required");
  }
}
