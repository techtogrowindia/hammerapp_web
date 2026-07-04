import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-jwt-secret-change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "30d";

export interface TechnicianTokenPayload {
  sub: string; // technician.id
  code: string; // technician.code (e.g. T2607040001)
  mobile: string;
}

export function signTechnicianToken(payload: TechnicianTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function verifyTechnicianToken(
  token: string,
): TechnicianTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TechnicianTokenPayload;
  } catch {
    return null;
  }
}
