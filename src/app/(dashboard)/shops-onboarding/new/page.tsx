import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NewShopForm } from "./NewShopForm";

export default function NewShopPage() {
  return (
    <div className="space-y-5">
      <Link href="/shops-onboarding" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" />
        Back to onboarding
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-800">Add Shop</h1>
        <p className="text-sm text-slate-500 mt-1">Register a shop (retailer), or bulk-import from CSV.</p>
      </div>

      <NewShopForm />
    </div>
  );
}
