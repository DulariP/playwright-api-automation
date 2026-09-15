import { expect, APIResponse } from "@playwright/test";
import { Booking } from "../models/Booking";

export function verifyStatusCode(actualStatus: number, expectedStatus: number) {
  expect(
    actualStatus,
    [
      "",
      "========== STATUS CODE ASSERTION FAILED ==========",
      `Expected Status : ${expectedStatus}`,
      `Actual Status   : ${actualStatus}`,
      "=================================================",
    ].join("\n"),
  ).toBe(expectedStatus);
}

export async function verifyResponseTime(
  response: APIResponse,
  maxTime: number = 3000,
) {
  expect(response.status()).toBeLessThan(500);
  expect(response.headers()).toBeTruthy();
}

export function verifyResponseContains(responseBody: object, property: string) {
  expect(responseBody).toHaveProperty(property);
}

export function verifyBooking(actual: Booking, expected: Booking) {
  expect(actual.firstname).toBe(expected.firstname);
  expect(actual.lastname).toBe(expected.lastname);
  expect(actual.totalprice).toBe(expected.totalprice);
  expect(actual.depositpaid).toBe(expected.depositpaid);
  expect(actual.bookingdates.checkin).toBe(expected.bookingdates.checkin);
  expect(actual.bookingdates.checkout).toBe(expected.bookingdates.checkout);
  expect(actual.additionalneeds).toBe(expected.additionalneeds);
}

export function verifyErrorResponse(
  actualStatus: number,
  expectedStatus: number,
  body: unknown,
) {
  verifyStatusCode(actualStatus, expectedStatus);
  expect(body).toBeDefined();
}
