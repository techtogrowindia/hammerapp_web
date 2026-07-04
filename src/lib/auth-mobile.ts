import type { NextRequest } from "next/server";
import {
  verifyTechnicianToken,
  verifyShopToken,
  type TechnicianTokenPayload,
} from "./jwt";
import { prisma } from "./prisma";
import type { Technician, Shop } from "@prisma/client";

const PREAUTH_TOKEN = process.env.MOBILE_PREAUTH_TOKEN ?? "12345678";

function extractBearer(req: NextRequest): string | null {
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

/**
 * Validates the static pre-auth token used by create/login/forgot/otp
 * endpoints. See claude.md §5 (Authentication Pattern).
 */
export function checkPreAuth(req: NextRequest): boolean {
  return extractBearer(req) === PREAUTH_TOKEN;
}

/**
 * Resolves the authenticated technician from the session JWT.
 * Returns null when the token is missing, invalid, or the technician
 * no longer exists.
 */
export async function getAuthTechnician(
  req: NextRequest,
): Promise<Technician | null> {
  const token = extractBearer(req);
  if (!token) return null;

  const payload: TechnicianTokenPayload | null = verifyTechnicianToken(token);
  if (!payload?.sub) return null;

  return prisma.technician.findUnique({ where: { id: payload.sub } });
}

/**
 * Resolves the authenticated shop from the session JWT (kind=shop).
 * Returns null when the token is missing, invalid, or the shop no
 * longer exists.
 */
export async function getAuthShop(req: NextRequest): Promise<Shop | null> {
  const token = extractBearer(req);
  if (!token) return null;

  const payload = verifyShopToken(token);
  if (!payload?.sub) return null;

  return prisma.shop.findUnique({ where: { id: payload.sub } });
}
