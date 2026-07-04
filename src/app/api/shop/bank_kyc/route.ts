import type { NextRequest } from "next/server";
import { getAuthShop } from "@/lib/auth-mobile";
import { shopOk, shopFail, shopUnauthorized, shopServerError } from "@/lib/api-shop";
import { prisma } from "@/lib/prisma";
import { recomputeShopKycStatus } from "@/lib/kyc-shop";
import type { BankAccountType } from "@prisma/client";

function parseAccountType(raw?: string | null): BankAccountType | undefined {
  if (!raw) return undefined;
  const v = raw.toLowerCase();
  if (v.startsWith("sav")) return "SAVINGS";
  if (v.startsWith("cur")) return "CURRENT";
  return undefined;
}

// GET /api/shop/bank_kyc
export async function GET(req: NextRequest) {
  const shop = await getAuthShop(req);
  if (!shop) return shopUnauthorized();
  const b = await prisma.shopBankKyc.findUnique({ where: { shopId: shop.id } });
  return shopOk(b ? serialize(b) : null, "Bank KYC");
}

export async function POST(req: NextRequest) {
  return save(req);
}
export async function PATCH(req: NextRequest) {
  return save(req);
}

async function save(req: NextRequest) {
  const shop = await getAuthShop(req);
  if (!shop) return shopUnauthorized();

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return shopFail("Invalid JSON body");
  }

  const s = (k: string) => {
    const v = body[k];
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
  };

  try {
    const data = {
      bankName: s("bank_name"),
      accountHolder: s("account_holder_name") ?? s("account_holder"),
      accountNumber: s("bank_account_number") ?? s("account_number"),
      accountType: parseAccountType(s("account_type")),
      ifsc: s("ifsc_code")?.toUpperCase() ?? s("ifsc")?.toUpperCase(),
      branch: s("branch_name") ?? s("branch"),
      upiId: s("upi_id"),
      status: "PENDING" as const,
    };

    const saved = await prisma.shopBankKyc.upsert({
      where: { shopId: shop.id },
      create: { shopId: shop.id, ...data },
      update: data,
    });

    await recomputeShopKycStatus(shop.id);
    return shopOk(serialize(saved), "Bank KYC saved");
  } catch (err) {
    console.error("[shop/bank_kyc]", err);
    return shopServerError();
  }
}

function serialize(b: {
  bankName: string | null; accountHolder: string | null; accountNumber: string | null;
  accountType: string | null; ifsc: string | null; branch: string | null;
  upiId: string | null; passbookFile: string | null; status: string; remark: string | null;
}) {
  return {
    bank_name: b.bankName,
    account_holder_name: b.accountHolder,
    account_number: b.accountNumber,
    bank_account_number: b.accountNumber,
    account_type: b.accountType ? b.accountType.toLowerCase() : null,
    ifsc_code: b.ifsc,
    branch_name: b.branch,
    upi_id: b.upiId,
    passbook_file: b.passbookFile,
    status: b.status,
    remark: b.remark,
  };
}
