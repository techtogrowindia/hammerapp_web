import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";
import { KycForms } from "./KycForms";

export const dynamic = "force-dynamic";

export default async function KycEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [tech, bloodGroups, services, locations, certificates] = await Promise.all([
    prisma.technician.findUnique({ where: { id } }),
    prisma.bloodGroup.findMany({ orderBy: { name: "asc" } }),
    prisma.serviceCategory.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.location.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.certificate.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  if (!tech) notFound();

  return (
    <div className="space-y-5">
      <Link
        href={`/technicians/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to technician
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Enter KYC Data
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {tech.name ?? "Technician"} · <span className="font-mono text-xs">{tech.code}</span>
        </p>
      </div>

      <KycForms
        technicianId={id}
        bloodGroups={bloodGroups.map((b) => ({ id: b.id, name: b.name }))}
        services={services.map((s) => ({ id: s.id, name: s.name }))}
        locations={locations.map((l) => ({ id: l.id, name: l.name }))}
        certificates={certificates.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
