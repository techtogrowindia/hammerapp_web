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
  message: string;
  data?: T;
}

export function ok<T>(data?: T, message = "Success", init?: ResponseInit) {
  return NextResponse.json<ApiEnvelope<T>>(
    { status: true, message, data },
    { status: 200, ...init },
  );
}

export function created<T>(data?: T, message = "Created") {
  return ok(data, message, { status: 201 });
}

export function fail(message: string, status = 400, data?: unknown) {
  return NextResponse.json<ApiEnvelope>(
    { status: false, message, data },
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
