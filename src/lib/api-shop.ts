import { NextResponse } from "next/server";

/**
 * Shop mobile API envelope.
 *
 * ⚠️ Different from the technician envelope (`{ status, message, data }`).
 * The Hammer Shop Flutter app parses `{ success, message, data, token }`
 * (verified against techtogrowindia/hammer_shop: LoginResponse,
 * OtpVerifyResponse, RegisterResponse). Validation errors are surfaced
 * under an `errors` map. Keep these keys stable — see claude.md §11.
 */
export interface ShopEnvelope<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  token?: string;
  errors?: Record<string, string[]>;
}

export function shopOk<T>(
  data?: T,
  message = "Success",
  extra?: { token?: string; init?: ResponseInit },
) {
  return NextResponse.json<ShopEnvelope<T>>(
    { success: true, message, data, ...(extra?.token ? { token: extra.token } : {}) },
    { status: 200, ...extra?.init },
  );
}

export function shopCreated<T>(data?: T, message = "Created", token?: string) {
  return shopOk(data, message, { token, init: { status: 201 } });
}

export function shopFail(
  message: string,
  status = 400,
  errors?: Record<string, string[]>,
) {
  return NextResponse.json<ShopEnvelope>(
    { success: false, message, ...(errors ? { errors } : {}) },
    { status },
  );
}

export function shopUnauthorized(message = "Unauthorized") {
  return shopFail(message, 401);
}

export function shopNotFound(message = "Not found") {
  return shopFail(message, 404);
}

export function shopServerError(message = "Something went wrong") {
  return shopFail(message, 500);
}
