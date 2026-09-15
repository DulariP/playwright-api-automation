import { faker } from "@faker-js/faker";
import { Booking } from "../models/Booking";

function randomDate(): string {
  return faker.date.future().toISOString().split("T")[0]!;
}

export function generateBookingData(): Booking {
  return {
    firstname: faker.person.firstName(),
    lastname: faker.person.lastName(),
    totalprice: faker.number.int({
      min: 100,
      max: 1000,
    }),
    depositpaid: faker.datatype.boolean(),
    bookingdates: {
      checkin: randomDate(),
      checkout: randomDate(),
    },
    additionalneeds: faker.helpers.arrayElement([
      "Breakfast",
      "Lunch",
      "Dinner",
      "Extra Bed",
    ]),
  };
}

export function generateName() {
  return {
    firstname: faker.person.firstName(),
    lastname: faker.person.lastName(),
  };
}  
