import { Booking } from "./Booking";

export interface AuthResponse {
  token?: string;
  reason?: string;
}

export interface CreateBookingResponse {
  bookingid: number;
  booking: Booking;
}

export interface UpdateBookingResponse extends Booking {}
export interface GetBookingResponse extends Booking {}
export interface DeleteBookingResponse {}
