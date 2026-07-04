import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NewTechnicianForm } from "./NewTechnicianForm";

export default function NewTechnicianPage() {
  return (
    <div className="space-y-5">
      <Link
        href="/technicians"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to onboarding
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-800">Add Technician</h1>
        <p className="text-sm text-slate-500 mt-1">
          Register a technician, or bulk-import from CSV.
        </p>
      </div>

      <NewTechnicianForm />
    </div>
  );
}
