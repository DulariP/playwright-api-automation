import { test as base } from "@playwright/test";
import { BookingApi } from "../api/BookingApi";
import { AuthApi } from "../api/AuthApi";

type ApiFixtures = {
  bookingApi: BookingApi;
  authApi: AuthApi;
};

export const test = base.extend<ApiFixtures>({
  bookingApi: async ({ request }, use) => {
    const bookingApi = new BookingApi(request);
    await use(bookingApi);
  },

  authApi: async ({ request }, use) => {
    const authApi = new AuthApi(request);
    await use(authApi);
  },
});

export { expect } from "@playwright/test";
