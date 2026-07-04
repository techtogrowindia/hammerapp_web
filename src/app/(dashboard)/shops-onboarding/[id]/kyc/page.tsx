import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";
import { ShopKycForms } from "./ShopKycForms";

export const dynamic = "force-dynamic";

export default async function ShopKycEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const shopId = Number(id);
  if (!Number.isInteger(shopId)) notFound();

  const [shop, bloodGroups, products] = await Promise.all([
    prisma.shop.findUnique({
      where: { id: shopId },
      include: {
        personalKyc: { include: { bloodGroup: true } },
        companyKyc: true,
        bankKyc: true,
        documents: true,
        partners: true,
        productCategories: { include: { productCategory: true, productSubcategory: true } },
      },
    }),
    prisma.bloodGroup.findMany({ orderBy: { name: "asc" } }),
    prisma.productCategory.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: { subcategories: { where: { active: true }, orderBy: { name: "asc" } } },
    }),
  ]);

  if (!shop) notFound();

  const p = shop.personalKyc;
  const c = shop.companyKyc;
  const b = shop.bankKyc;

  const existing = {
    profile: {
      name: p?.name ?? shop.name ?? "",
      dob: p?.dob ? p.dob.toISOString().slice(0, 10) : "",
      bloodGroup: p?.bloodGroup?.name ?? "",
      aadharNumber: p?.aadharNumber ?? "",
      panNumber: p?.panNumber ?? "",
      firmType: p?.firmType ?? "",
      businessPan: p?.businessPan ?? "",
      address: p?.address ?? "",
      cityTownVillage: p?.cityTownVillage ?? "",
      taluk: p?.taluk ?? "",
      district: p?.district ?? "",
      pincode: p?.pincode ?? "",
      profilePhoto: p?.profilePhoto ?? "",
    },
    partners: shop.partners.map((pt) => pt.name),
    company: {
      hasGst: c?.hasGst ?? false,
      gstNumber: c?.gstNumber ?? "",
      legalName: c?.legalName ?? "",
      companyName: c?.companyName ?? "",
      companyAddress: c?.companyAddress ?? "",
      cityTownVillage: c?.cityTownVillage ?? "",
      taluk: c?.taluk ?? "",
      district: c?.district ?? "",
      companyPincode: c?.companyPincode ?? "",
      numberOfEmployees: c?.numberOfEmployees != null ? String(c.numberOfEmployees) : "",
    },
    bank: {
      bankName: b?.bankName ?? "",
      accountHolder: b?.accountHolder ?? "",
      accountNumber: b?.accountNumber ?? "",
      accountType: b?.accountType ?? "",
      ifsc: b?.ifsc ?? "",
      branch: b?.branch ?? "",
      upiId: b?.upiId ?? "",
      passbookFile: b?.passbookFile ?? "",
    },
    products: shop.productCategories.map((pc) => ({
      name: pc.productCategory.name,
      subcategory: pc.productSubcategory?.name ?? null,
    })),
    documents: shop.documents.map((d) => ({
      docType: d.docType,
      docNumber: d.docNumber,
      hasFront: !!d.frontFile,
      hasBack: !!d.backFile,
      frontFile: d.frontFile ?? null,
      backFile: d.backFile ?? null,
    })),
  };

  return (
    <div className="space-y-5">
      <Link href={`/shops-onboarding/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" />
        Back to shop
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-800">Enter KYC Data</h1>
        <p className="text-sm text-slate-500 mt-1">
          {shop.name ?? "Shop"} · <span className="font-mono text-xs">{shop.code}</span>
        </p>
      </div>

      <ShopKycForms
        shopId={shopId}
        bloodGroups={bloodGroups.map((bg) => ({ id: bg.id, name: bg.name }))}
        products={products.map((pc) => ({
          id: pc.id,
          name: pc.name,
          subcategories: pc.subcategories.map((s) => ({ id: s.id, name: s.name })),
        }))}
        existing={existing}
      />
    </div>
  );
}
