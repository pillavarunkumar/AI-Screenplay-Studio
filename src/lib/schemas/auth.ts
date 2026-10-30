import { z } from "zod";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.")
  .max(254);

export const LoginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password.").max(200),
});

export const SignupSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(80),
  email,
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .max(200, "Use at most 200 characters."),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type SignupInput = z.infer<typeof SignupSchema>;

export interface PublicUser {
  id: string;
  name: string;
  email: string;
}
