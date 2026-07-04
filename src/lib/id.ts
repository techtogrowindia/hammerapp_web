import { prisma } from "./prisma";

export type EntityPrefix = "T" | "S" | "C"; // Technician | Shop | Customer

/**
 * Generates the public unique ID: {prefix}{YYMMDD}{sequence:4}
 * e.g. T2607040001 — sequence resets per (prefix, date).
 *
 * Uses the count of same-prefix rows created "today" to derive the next
 * sequence. Wrapped in a transaction by the caller for safety under load;
 * for higher concurrency swap this for a dedicated counter table.
 */
export async function generateTechnicianCode(
  date: Date = new Date(),
): Promise<string> {
  const prefix: EntityPrefix = "T";
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const datePart = `${yy}${mm}${dd}`;
  const codePrefix = `${prefix}${datePart}`;

  // Count technicians whose code starts with today's prefix.
  const countToday = await prisma.technician.count({
    where: { code: { startsWith: codePrefix } },
  });

  const sequence = String(countToday + 1).padStart(4, "0");
  return `${codePrefix}${sequence}`;
}
