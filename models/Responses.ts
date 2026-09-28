import { Booking } from "./Booking";

export interface AuthSuccessResponse {
  token: string;
}

export interface AuthErrorResponse {
  reason: string;
}

export interface CreateBookingResponse {
  bookingid: number;
  booking: Booking;
}

export interface UpdateBookingResponse extends Booking {}

export interface GetBookingResponse extends Booking {}

export interface DeleteBookingResponse {}