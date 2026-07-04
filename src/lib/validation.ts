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

// ─────────────────────────────────────────────────────────────
// Shop auth (password-based — see hammer_shop mobile contract)
// ─────────────────────────────────────────────────────────────

export const createShopSchema = z.object({
  name: z.string().trim().min(1).optional(),
  mobile: mobileSchema,
  email: z.string().trim().email().optional().or(z.literal("")),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const shopLoginSchema = z.object({
  mobile: mobileSchema,
  password: z.string().min(1, "Password is required"),
});

/** Shop verify-otp is authenticated (token from create/login); body is just the otp. */
export const shopVerifyOtpSchema = z.object({
  otp: z.string().trim().min(4).max(8),
});

export const shopForgotPasswordSchema = z.object({
  mobile: mobileSchema,
});

export const shopVerifyForgotOtpSchema = z.object({
  mobile: mobileSchema,
  otp: z.string().trim().min(4).max(8),
});

export const shopUpdatePasswordSchema = z.object({
  mobile: mobileSchema,
  otp: z.string().trim().min(4).max(8),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

/** Formats a ZodError into a single human-readable message. */
export function formatZodError(err: z.ZodError): string {
  return err.issues
    .map((i) => `${i.path.join(".") || "field"}: ${i.message}`)
    .join("; ");
}
