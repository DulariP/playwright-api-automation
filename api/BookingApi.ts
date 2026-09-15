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

export class BookingApi extends BaseApi {
  async createBooking(
    data: Booking,
    options?: RequestOptions,
  ): Promise<ApiResult<CreateBookingResponse>> {
    return this.post<CreateBookingResponse>(
      API_ENDPOINTS.BOOKING,
      data,
      options,
    );
  }

  async getBooking(
    id: number,
    options?: RequestOptions,
  ): Promise<ApiResult<GetBookingResponse>> {
    return this.get<GetBookingResponse>(
      `${API_ENDPOINTS.BOOKING}/${id}`,
      options,
    );
  }

  async updateBooking(
    bookingId: number,
    bookingData: Booking,
  ): Promise<ApiResult<UpdateBookingResponse>> {
    return this.put<UpdateBookingResponse>(
      `${API_ENDPOINTS.BOOKING}/${bookingId}`,
      bookingData,
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
        ...options,
      },
    );
  }

  async partialUpdateBooking(bookingId: number, data: Partial<Booking>) {
    return this.patch<Booking>(`${API_ENDPOINTS.BOOKING}/${bookingId}`, data);
  }

  async deleteBooking(bookingId: number): Promise<ApiResult<string>> {
    return this.delete<string>(`${API_ENDPOINTS.BOOKING}/${bookingId}`);
  }
}
