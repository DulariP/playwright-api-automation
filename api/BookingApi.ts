import { BaseApi } from "./BaseApi";
import { Booking } from "../models/Booking";
import { API_ENDPOINTS } from "../constants/apiEndpoints";
import { RequestOptions } from "../models/RequestOptions";
import {
  CreateBookingResponse,
  GetBookingResponse,
  UpdateBookingResponse,
} from "../models/Responses";
import { ApiResult } from "../models/ApiResult";
import { bookingRequestSchema } from "../src/schemas/bookingRequest.schema";
import { bookingCreateResponseSchema } from "../src/schemas/bookingCreateResponse.schema";
import { bookingSchema } from "../src/schemas/booking.schema";
import { patchBookingRequestSchema } from "../src/schemas/patchBookingRequest.schema";
import { updateBookingResponseSchema } from "../src/schemas/updateBookingResponse.schema";
import { deleteBookingResponseSchema } from "../src/schemas/deleteBookingResponse.schema";

export class BookingApi extends BaseApi {
  async createBooking(
    data: Booking,
    options?: RequestOptions,
  ): Promise<ApiResult<CreateBookingResponse>> {
    return this.post<CreateBookingResponse>(API_ENDPOINTS.BOOKING, data, {
      requestSchema: bookingRequestSchema,
      responseSchema: bookingCreateResponseSchema,
      ...options,
    });
  }

  async getBooking(
    id: number,
    options?: RequestOptions,
  ): Promise<ApiResult<GetBookingResponse>> {
    return this.get<GetBookingResponse>(`${API_ENDPOINTS.BOOKING}/${id}`, {
      responseSchema: bookingSchema,
      ...options,
    });
  }

  async updateBooking(
    bookingId: number,
    bookingData: Booking,
    options?: RequestOptions,
  ): Promise<ApiResult<UpdateBookingResponse>> {
    return this.put<UpdateBookingResponse>(
      `${API_ENDPOINTS.BOOKING}/${bookingId}`,
      bookingData,
      {
        requestSchema: bookingRequestSchema,
        responseSchema: updateBookingResponseSchema,
        ...options,
      },
    );
  }

  async updateBookingWithoutAuth(
    bookingId: number,
    bookingData: Booking,
    options?: RequestOptions,
  ): Promise<ApiResult<UpdateBookingResponse>> {
    return this.put<UpdateBookingResponse>(
      `${API_ENDPOINTS.BOOKING}/${bookingId}`,
      bookingData,
      {
        requiresAuth: false,
        requestSchema: bookingRequestSchema,
        responseSchema: updateBookingResponseSchema,
        ...options,
      },
    );
  }

  async partialUpdateBooking(
    bookingId: number,
    data: Partial<Booking>,
    options?: RequestOptions,
  ): Promise<ApiResult<Booking>> {
    return this.patch<Booking>(`${API_ENDPOINTS.BOOKING}/${bookingId}`, data, {
      requestSchema: patchBookingRequestSchema,
      responseSchema: bookingSchema,
      ...options,
    });
  }

  async deleteBooking(
    bookingId: number,
    options?: RequestOptions,
  ): Promise<ApiResult<string>> {
    return this.delete<string>(`${API_ENDPOINTS.BOOKING}/${bookingId}`, {
      responseSchema: deleteBookingResponseSchema,
      ...options,
    });
  }
}
