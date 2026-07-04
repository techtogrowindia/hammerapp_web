import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateTechnicianCode } from "@/lib/id";
import { ok, created, fail, unauthorized, serverError } from "@/lib/api";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().trim().min(1),
  mobile: z.string().trim().regex(/^\d{10}$/),
  email: z.string().trim().email().optional().or(z.literal("")),
});

// POST /api/admin/technicians — admin registers a new technician
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body");
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return fail(
      parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; "),
    );
  }

  const { name, mobile, email } = parsed.data;

  try {
    const existing = await prisma.technician.findUnique({ where: { mobile } });
    if (existing) {
      return fail("Mobile number already registered.", 409);
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

    return created(tech, "Technician registered. Next: submit KYC data.");
  } catch (err) {
    console.error("[admin/technicians POST]", err);
    return serverError();
  }
}

// GET /api/admin/technicians — list all technicians (with pagination)
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return unauthorized();

  try {
    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const limit = Math.min(100, Number(url.searchParams.get("limit")) || 20);

    const [technicians, total] = await Promise.all([
      prisma.technician.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { personalKyc: { select: { fullName: true } } },
      }),
      prisma.technician.count(),
    ]);

    return ok(
      { data: technicians, pagination: { page, limit, total } },
      "Technicians listed",
    );
  } catch (err) {
    console.error("[admin/technicians GET]", err);
    return serverError();
  }
}
