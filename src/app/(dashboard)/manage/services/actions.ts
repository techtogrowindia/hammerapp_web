"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { saveUpload, UploadError } from "@/lib/upload";

export interface ActionResult {
  ok: boolean;
  message: string;
}

async function requireAuth() {
  const session = await auth();
  return !!session?.user;
}

function str(fd: FormData, key: string): string | undefined {
  const v = fd.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function done(path = "/manage/services") {
  revalidatePath(path);
}

// ── Categories ───────────────────────────────────────────────
export async function saveCategory(_prev: ActionResult | undefined, fd: FormData): Promise<ActionResult> {
  if (!(await requireAuth())) return { ok: false, message: "Unauthorized" };
  const id = str(fd, "id");
  const name = str(fd, "name");
  if (!name) return { ok: false, message: "Name is required" };
  const data = { name, description: str(fd, "description") ?? null, active: fd.getAll("active").includes("true") };
  try {
    if (id) await prisma.serviceCategory.update({ where: { id }, data });
    else await prisma.serviceCategory.create({ data });
    done();
    return { ok: true, message: id ? "Category updated" : "Category created" };
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") return { ok: false, message: "A category with that name already exists" };
    console.error("[saveCategory]", err);
    return { ok: false, message: "Something went wrong" };
  }
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  if (!(await requireAuth())) return { ok: false, message: "Unauthorized" };
  try {
    const linked = await prisma.technicianServiceCategory.count({ where: { serviceCategoryId: id } });
    if (linked > 0) return { ok: false, message: `Cannot delete — ${linked} technician(s) use this category.` };
    await prisma.serviceCategory.delete({ where: { id } });
    done();
    return { ok: true, message: "Category deleted" };
  } catch (err) {
    console.error("[deleteCategory]", err);
    return { ok: false, message: "Something went wrong" };
  }
}

// ── Subcategories ────────────────────────────────────────────
export async function saveSubcategory(_prev: ActionResult | undefined, fd: FormData): Promise<ActionResult> {
  if (!(await requireAuth())) return { ok: false, message: "Unauthorized" };
  const id = str(fd, "id");
  const name = str(fd, "name");
  const serviceCategoryId = str(fd, "serviceCategoryId");
  if (!name) return { ok: false, message: "Name is required" };
  if (!serviceCategoryId) return { ok: false, message: "Category is required" };
  const data = { name, serviceCategoryId, active: fd.getAll("active").includes("true") };
  try {
    if (id) await prisma.serviceSubcategory.update({ where: { id }, data });
    else await prisma.serviceSubcategory.create({ data });
    done();
    return { ok: true, message: id ? "Sub category updated" : "Sub category created" };
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") return { ok: false, message: "That sub category already exists in this category" };
    console.error("[saveSubcategory]", err);
    return { ok: false, message: "Something went wrong" };
  }
}

export async function deleteSubcategory(id: string): Promise<ActionResult> {
  if (!(await requireAuth())) return { ok: false, message: "Unauthorized" };
  try {
    await prisma.serviceSubcategory.delete({ where: { id } });
    done();
    return { ok: true, message: "Sub category deleted" };
  } catch (err) {
    console.error("[deleteSubcategory]", err);
    return { ok: false, message: "Something went wrong" };
  }
}

// ── Services ─────────────────────────────────────────────────
export async function saveService(_prev: ActionResult | undefined, fd: FormData): Promise<ActionResult> {
  if (!(await requireAuth())) return { ok: false, message: "Unauthorized" };
  const id = str(fd, "id");
  const name = str(fd, "name");
  const serviceCategoryId = str(fd, "serviceCategoryId");
  if (!name) return { ok: false, message: "Service name is required" };
  if (!serviceCategoryId) return { ok: false, message: "Category is required" };

  const taxRaw = str(fd, "taxPercent");
  const taxPercent = taxRaw ? Number(taxRaw) : 0;
  if (Number.isNaN(taxPercent) || taxPercent < 0 || taxPercent > 100) {
    return { ok: false, message: "Tax % must be between 0 and 100" };
  }

  try {
    let image: string | undefined;
    const file = fd.get("image");
    if (file instanceof File && file.size > 0) {
      const stored = await saveUpload(file, "service", "catalog");
      image = stored.path;
    }

    const data = {
      name,
      serviceCategoryId,
      serviceSubcategoryId: str(fd, "serviceSubcategoryId") ?? null,
      taxPercent,
      sacCode: str(fd, "sacCode") ?? null,
      active: fd.getAll("active").includes("true"),
      ...(image ? { image } : {}),
    };

    if (id) await prisma.service.update({ where: { id }, data });
    else await prisma.service.create({ data });
    done();
    return { ok: true, message: id ? "Service updated" : "Service created" };
  } catch (err) {
    if (err instanceof UploadError) return { ok: false, message: err.message };
    console.error("[saveService]", err);
    return { ok: false, message: "Something went wrong" };
  }
}

export async function deleteService(id: string): Promise<ActionResult> {
  if (!(await requireAuth())) return { ok: false, message: "Unauthorized" };
  try {
    await prisma.service.delete({ where: { id } });
    done();
    return { ok: true, message: "Service deleted" };
  } catch (err) {
    console.error("[deleteService]", err);
    return { ok: false, message: "Something went wrong" };
  }
}
