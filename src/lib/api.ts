import { NextResponse } from "next/server";

/**
 * Standard mobile API envelope.
 *
 * NOTE: The Flutter app's model classes (kyc_step*_model, etc.) parse this
 * shape. Keep `{ status, message, data }` stable — see claude.md §10
 * (API backward compatibility). Verify field names against the Flutter
 * `*_model.dart` files before changing.
 */
export interface ApiEnvelope<T = unknown> {
  status: boolean;
  /** Mirror of `status` — the current Flutter apps read `success`. */
  success: boolean;
  message: string;
  data?: T;
  /** Optional session token, surfaced top-level for the mobile apps. */
  token?: string;
}

export function ok<T>(
  data?: T,
  message = "Success",
  init?: ResponseInit & { token?: string },
) {
  const { token, ...rest } = init ?? {};
  return NextResponse.json<ApiEnvelope<T>>(
    { status: true, success: true, message, data, ...(token ? { token } : {}) },
    { status: 200, ...rest },
  );
}

export function created<T>(data?: T, message = "Created", token?: string) {
  return ok(data, message, { status: 201, ...(token ? { token } : {}) });
}

export function fail(message: string, status = 400, data?: unknown) {
  return NextResponse.json<ApiEnvelope>(
    { status: false, success: false, message, data },
    { status },
  );
}

export function unauthorized(message = "Unauthorized") {
  return fail(message, 401);
}

export function notFound(message = "Not found") {
  return fail(message, 404);
}

export function serverError(message = "Something went wrong") {
  return fail(message, 500);
}
