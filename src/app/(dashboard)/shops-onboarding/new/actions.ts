"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateShopCode } from "@/lib/id";
import { parse } from "csv-parse/sync";
import { z } from "zod";
import type { FirmType } from "@prisma/client";

const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  mobile: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, "").slice(-10))
    .refine((v) => v.length === 10, "Mobile must be 10 digits"),
  email: z.string().trim().email().optional().or(z.literal("")),
  firmType: z.enum(["PROPRIETORSHIP", "PARTNERSHIP", "PRIVATE_LIMITED"]).optional(),
  password: z.string().optional(),
});

async function tempPasswordHash(provided?: string): Promise<string> {
  const pwd = provided && provided.length >= 6 ? provided : crypto.randomBytes(6).toString("hex");
  return bcrypt.hash(pwd, 10);
}

export interface RegisterResult {
  ok: boolean;
  message: string;
  shopId?: number;
}

/** Admin registers a single shop. Owner sets their own password via forgot-password. */
export async function registerShop(
  _prev: RegisterResult | undefined,
  formData: FormData,
): Promise<RegisterResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "Unauthorized" };

  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    mobile: formData.get("mobile"),
    email: formData.get("email"),
    firmType: formData.get("firmType") || undefined,
    password: formData.get("password") || undefined,
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };

  const { name, mobile, email, firmType, password } = parsed.data;

  try {
    const existing = await prisma.shop.findUnique({ where: { mobile } });
    if (existing) return { ok: false, message: "Mobile number already registered." };

    const code = await generateShopCode();
    const hash = await tempPasswordHash(password);
    const shop = await prisma.shop.create({
      data: {
        code,
        name,
        mobile,
        email: email || null,
        password: hash,
        status: "INACTIVE",
        kycStatus: "NOT_STARTED",
      },
    });

    // Seed the firm type onto the personal KYC if provided.
    if (firmType) {
      await prisma.shopPersonalKyc.create({
        data: { shopId: shop.id, name, firmType: firmType as FirmType, status: "PENDING" },
      });
    }

    revalidatePath("/shops-onboarding");
    return { ok: true, message: `Shop ${shop.code} registered.`, shopId: shop.id };
  } catch (err) {
    console.error("[registerShop]", err);
    return { ok: false, message: "Something went wrong." };
  }
}

export interface ImportResult {
  ok: boolean;
  message: string;
  created?: number;
  skipped?: number;
  errors?: string[];
}

interface CsvRow {
  name?: string;
  mobile?: string;
  email?: string;
  firm_type?: string;
}

function parseFirm(raw?: string): FirmType | undefined {
  if (!raw) return undefined;
  const v = raw.toLowerCase().replace(/[\s_-]/g, "");
  if (v === "proprietorship") return "PROPRIETORSHIP";
  if (v === "partnership") return "PARTNERSHIP";
  if (v === "privatelimited") return "PRIVATE_LIMITED";
  return undefined;
}

/** Admin bulk-imports shops from a CSV file. */
export async function importCsv(
  _prev: ImportResult | undefined,
  formData: FormData,
): Promise<ImportResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "Unauthorized" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Please choose a CSV file." };
  }

  let rows: CsvRow[];
  try {
    const text = await file.text();
    rows = parse(text, { columns: true, skip_empty_lines: true, trim: true }) as CsvRow[];
  } catch {
    return { ok: false, message: "Invalid CSV. Required columns: name, mobile, email, firm_type" };
  }
  if (rows.length === 0) return { ok: false, message: "CSV has no data rows." };

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const line = i + 2;
    const mobile = (row.mobile ?? "").replace(/\D/g, "").slice(-10);
    const name = row.name?.trim();

    if (mobile.length !== 10) { errors.push(`Line ${line}: invalid mobile`); skipped++; continue; }
    if (!name) { errors.push(`Line ${line}: name required`); skipped++; continue; }

    try {
      const existing = await prisma.shop.findUnique({ where: { mobile } });
      if (existing) { errors.push(`Line ${line}: mobile ${mobile} already exists`); skipped++; continue; }

      const code = await generateShopCode();
      const hash = await tempPasswordHash();
      const shop = await prisma.shop.create({
        data: {
          code, name, mobile, email: row.email?.trim() || null,
          password: hash, status: "INACTIVE", kycStatus: "NOT_STARTED",
        },
      });

      const firm = parseFirm(row.firm_type);
      if (firm) {
        await prisma.shopPersonalKyc.create({
          data: { shopId: shop.id, name, firmType: firm, status: "PENDING" },
        });
      }
      created++;
    } catch (err) {
      errors.push(`Line ${line}: ${(err as Error).message}`);
      skipped++;
    }
  }

  revalidatePath("/shops-onboarding");
  return {
    ok: true,
    message: `Imported ${created} shop(s), ${skipped} skipped.`,
    created,
    skipped,
    errors: errors.slice(0, 20),
  };
}
