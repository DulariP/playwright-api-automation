import { faker } from "@faker-js/faker";
import { Booking } from "../../models/Booking";

export class BookingFactory {
  static create(overrides?: Partial<Booking>): Booking {
    const booking: Booking = {
      firstname: faker.person.firstName(),
      lastname: faker.person.lastName(),
      totalprice: faker.number.int({
        min: 100,
        max: 1000,
      }),
      depositpaid: faker.datatype.boolean(),
      bookingdates: generateBookingDates(),
      additionalneeds: faker.helpers.arrayElement([
        "Breakfast",
        "Lunch",
        "Dinner",
        "Extra Bed",
      ]),
    };
    return {
      ...booking,
      ...overrides,
    };
  }

  static createPatchData(overrides?: Partial<Booking>): Partial<Booking> {
    return {
      firstname: faker.person.firstName(),
      lastname: faker.person.lastName(),
      ...overrides,
    };
  }

  static withoutFirstname(): Partial<Booking> {
    const booking = this.create();
    const { firstname, ...invalidBooking } = booking;
    return invalidBooking;
  }

  static withoutLastname(): Partial<Booking> {
    const booking = this.create();
    const { lastname, ...invalidBooking } = booking;
    return invalidBooking;
  }

  static invalidPrice(): any {
    return {
      ...this.create(),
      totalprice: "invalid-price",
    };
  }

  static negativePrice(): any {
    return {
      ...this.create(),
      totalprice: -500,
    };
  }

  static invalidDepositPaid(): any {
    return {
      ...this.create(),
      depositpaid: "yes",
    };
  }

  static invalidDates(): Partial<Booking> {
    return {
      ...this.create(),
      bookingdates: {
        checkin: "2027-12-30",
        checkout: "2027-01-01",
      },
    };
  }

  static withExtraField(): any {
    return {
      ...this.create(),
      unexpectedField: "invalid",
    };
  }
}

function generateBookingDates(): {
  checkin: string;
  checkout: string;
} {
  const checkinDate = faker.date.future();
  const checkoutDate = faker.date.future({
    refDate: checkinDate,
  });
  return {
    checkin: checkinDate.toISOString().split("T")[0]!,
    checkout: checkoutDate.toISOString().split("T")[0]!,
  };
}
