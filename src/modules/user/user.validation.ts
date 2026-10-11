import { z } from "zod";
import { ERole } from "../../config/role";

interface ValidationResult {
  isOk: boolean;
  message: string;
}

export const validateUserInput = (
  firstName: string,
  lastName: string,
  email: string,
  password: string
): ValidationResult | null => {
  if (!firstName || !lastName || !email || !password) {
    return { isOk: false, message: "Please fill all the fields" };
  }
  if (password.length < 5) {
    return { isOk: false, message: "Password must be at least 5 characters" };
  }
  return null;
};

export const loginValidationSchema = z.object({
  body: z.object({
    email: z
      .string({
        required_error: "email is required!",
        invalid_type_error: "email must be a string",
      })
      .email(),
    password: z.string({
      required_error: "password is required!",
      invalid_type_error: "password must be a string",
    }),
  }),
});

export const registerUserValidationSchema = z.object({
  body: z.object({
    firstName: z.string({
      required_error: "first name is required!",
      invalid_type_error: "first name must be a string",
    }),
    lastName: z.string({
      required_error: "last name is required!",
      invalid_type_error: "last name must be a string",
    }),
    email: z
      .string({
        required_error: "email is required!",
        invalid_type_error: "email must be a string",
      })
      .email(),
    password: z
      .string({
        required_error: "password is required!",
        invalid_type_error: "password must be a string",
      })
      .min(8, "Password must be at least 8 characters long"),
    role: z.enum(ERole as [string, ...string[]], {
      required_error: "role is required!",
      invalid_type_error: `role must be one of: ${ERole.join(", ")}`,
    }),
  }),
});
