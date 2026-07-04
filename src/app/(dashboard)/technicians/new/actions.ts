"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateTechnicianCode } from "@/lib/id";
import { parse } from "csv-parse/sync";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  mobile: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, "").slice(-10))
    .refine((v) => v.length === 10, "Mobile must be 10 digits"),
  email: z.string().trim().email().optional().or(z.literal("")),
});

export interface RegisterResult {
  ok: boolean;
  message: string;
  technicianId?: string;
}

/** Admin registers a single technician. */
export async function registerTechnician(
  _prev: RegisterResult | undefined,
  formData: FormData,
): Promise<RegisterResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "Unauthorized" };

  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    mobile: formData.get("mobile"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message };
  }

  const { name, mobile, email } = parsed.data;

  try {
    const existing = await prisma.technician.findUnique({ where: { mobile } });
    if (existing) {
      return { ok: false, message: "Mobile number already registered." };
    }

    const code = await generateTechnicianCode();
    const tech = await prisma.technician.create({
      data: {
        code,
        name,
        mobile,
        email: email || null,
        status: "INACTIVE",
        kycStatus: "NOT_STARTED",
      },
    });

    revalidatePath("/technicians");
    return {
      ok: true,
      message: `Technician ${tech.code} registered.`,
      technicianId: tech.id,
    };
  } catch (err) {
    console.error("[registerTechnician]", err);
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
  service_category?: string;
}

/** Admin bulk-imports technicians from a CSV file. */
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
    return {
      ok: false,
      message: "Invalid CSV. Required columns: name, mobile, email, service_category",
    };
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

    if (mobile.length !== 10) {
      errors.push(`Line ${line}: invalid mobile`);
      skipped++;
      continue;
    }
    if (!name) {
      errors.push(`Line ${line}: name required`);
      skipped++;
      continue;
    }

    try {
      const existing = await prisma.technician.findUnique({ where: { mobile } });
      if (existing) {
        errors.push(`Line ${line}: mobile ${mobile} already exists`);
        skipped++;
        continue;
      }

      const code = await generateTechnicianCode();
      const tech = await prisma.technician.create({
        data: {
          code,
          name,
          mobile,
          email: row.email?.trim() || null,
          status: "INACTIVE",
          kycStatus: "NOT_STARTED",
        },
      });

      if (row.service_category?.trim()) {
        const svc = await prisma.serviceCategory.findFirst({
          where: { name: { contains: row.service_category.trim(), mode: "insensitive" } },
        });
        if (svc) {
          await prisma.technicianServiceCategory.create({
            data: { technicianId: tech.id, serviceCategoryId: svc.id, status: "PENDING" },
          });
        }
      }
      created++;
    } catch (err) {
      errors.push(`Line ${line}: ${(err as Error).message}`);
      skipped++;
    }
  }

  revalidatePath("/technicians");
  return {
    ok: true,
    message: `Imported ${created} technician(s), ${skipped} skipped.`,
    created,
    skipped,
    errors: errors.slice(0, 20),
  };
}
