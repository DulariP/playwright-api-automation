import { Auth } from "../../models/Auth";

export class AuthFactory {
  static validLogin(): Auth {
    return {
      username: process.env.BOOKER_USERNAME!,
      password: process.env.BOOKER_PASSWORD!,
    };
  }

  static invalidLogin(): Auth {
    return {
      username: "invalid_user",
      password: "wrong_password",
    };
  }

  static missingUsername(): Auth {
    return {
      username: "",
      password: process.env.BOOKER_PASSWORD!,
    };
  }

  static missingPassword(): Auth {
    return {
      username: process.env.BOOKER_USERNAME!,
      password: "",
    };
  }
}
