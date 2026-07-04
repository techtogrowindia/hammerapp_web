import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateTechnicianCode } from "@/lib/id";
import { ok, fail, unauthorized, serverError } from "@/lib/api";
import { parse } from "csv-parse/sync";

interface CsvRow {
  name?: string;
  mobile?: string;
  email?: string;
  service_category?: string;
}

// POST /api/admin/technicians/import — bulk create technicians from CSV
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return unauthorized();

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return fail("file is required");
    }

    const text = await file.text();
    const rows = parse(text, {
      columns: true,
      skip_empty_lines: true,
    }) as CsvRow[];

    if (rows.length === 0) {
      return fail("CSV is empty");
    }

    const results = {
      created: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const lineNum = i + 2; // +2 for header + 1-based
      const { name, mobile, email, service_category } = row;

      if (!mobile || !/^\d{10}$/.test(mobile.trim())) {
        results.errors.push(`Line ${lineNum}: invalid mobile (must be 10 digits)`);
        results.skipped++;
        continue;
      }

      if (!name?.trim()) {
        results.errors.push(`Line ${lineNum}: name is required`);
        results.skipped++;
        continue;
      }

      try {
        const existing = await prisma.technician.findUnique({ where: { mobile } });
        if (existing) {
          results.errors.push(`Line ${lineNum}: mobile already exists`);
          results.skipped++;
          continue;
        }

        const code = await generateTechnicianCode();
        const tech = await prisma.technician.create({
          data: {
            code,
            name: name.trim(),
            mobile: mobile.trim(),
            email: email?.trim() || null,
            status: "INACTIVE",
            kycStatus: "NOT_STARTED",
          },
        });

        // If service_category provided, create the link (but no verification)
        if (service_category?.trim()) {
          const svc = await prisma.serviceCategory.findFirst({
            where: { name: { contains: service_category.trim(), mode: "insensitive" } },
          });
          if (svc) {
            await prisma.technicianServiceCategory.create({
              data: {
                technicianId: tech.id,
                serviceCategoryId: svc.id,
                status: "PENDING",
              },
            });
          }
        }

        results.created++;
      } catch (err) {
        results.errors.push(`Line ${lineNum}: ${(err as Error).message}`);
        results.skipped++;
      }
    }

    return ok(results, `Imported ${results.created} technician(s)`);
  } catch (err) {
    console.error("[admin/technicians/import]", err);
    if (err instanceof Error && err.message.includes("Unexpected")) {
      return fail("Invalid CSV format. Columns: name, mobile, email, service_category");
    }
    return serverError();
  }
}
