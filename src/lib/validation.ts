import { z } from "zod";

/** Indian mobile: 10 digits, optionally with +91 / 0 prefix — normalized to 10 digits. */
export const mobileSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v.length >= 10, "Invalid mobile number")
  .transform((v) => v.slice(-10));

export const createTechnicianSchema = z.object({
  name: z.string().trim().min(1).optional(),
  mobile: mobileSchema,
  email: z.string().trim().email().optional().or(z.literal("")),
});

export const loginSchema = z.object({
  mobile: mobileSchema,
});

export const verifyOtpSchema = z.object({
  mobile: mobileSchema,
  otp: z.string().trim().min(4).max(8),
});

export const resendOtpSchema = z.object({
  mobile: mobileSchema,
});

/** Formats a ZodError into a single human-readable message. */
export function formatZodError(err: z.ZodError): string {
  return err.issues
    .map((i) => `${i.path.join(".") || "field"}: ${i.message}`)
    .join("; ");
}
