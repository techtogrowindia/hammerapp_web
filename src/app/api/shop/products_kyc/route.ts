import type { NextRequest } from "next/server";
import { getAuthShop } from "@/lib/auth-mobile";
import { shopOk, shopFail, shopUnauthorized, shopServerError } from "@/lib/api-shop";
import { prisma } from "@/lib/prisma";
import { recomputeShopKycStatus } from "@/lib/kyc-shop";

const MAX_ITEMS = 3;

// GET /api/shop/products_kyc → { shop_id, items: [...], max_items }
export async function GET(req: NextRequest) {
  const shop = await getAuthShop(req);
  if (!shop) return shopUnauthorized();
  const links = await prisma.shopProductCategory.findMany({
    where: { shopId: shop.id },
    include: { productCategory: true, productSubcategory: true },
    orderBy: { createdAt: "asc" },
  });
  return shopOk(
    {
      shop_id: shop.id,
      max_items: MAX_ITEMS,
      items: links.map((l) => ({
        product_category_id: l.productCategoryId,
        product_category_name: l.productCategory.name,
        product_subcategory_id: l.productSubcategoryId,
        product_subcategory_name: l.productSubcategory?.name ?? null,
        status: l.status,
      })),
    },
    "Products KYC",
  );
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

  let body: { items?: Array<{ product_category_id?: number; product_subcategory_id?: number }> };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return shopFail("Invalid JSON body");
  }

  const rawItems = body.items ?? [];
  if (rawItems.length > MAX_ITEMS) {
    return shopFail(`You can select at most ${MAX_ITEMS} product categories`);
  }

  const items = rawItems
    .map((i) => ({
      productCategoryId: Number(i.product_category_id),
      productSubcategoryId:
        i.product_subcategory_id != null ? Number(i.product_subcategory_id) : null,
    }))
    .filter((i) => Number.isInteger(i.productCategoryId) && i.productCategoryId > 0);

  try {
    // Validate categories exist.
    const catIds = [...new Set(items.map((i) => i.productCategoryId))];
    const found = await prisma.productCategory.findMany({ where: { id: { in: catIds } } });
    if (found.length !== catIds.length) {
      return shopFail("One or more product categories are invalid");
    }

    await prisma.$transaction([
      prisma.shopProductCategory.deleteMany({ where: { shopId: shop.id } }),
      ...(items.length
        ? [
            prisma.shopProductCategory.createMany({
              data: items.map((i) => ({
                shopId: shop.id,
                productCategoryId: i.productCategoryId,
                productSubcategoryId: i.productSubcategoryId,
                status: "PENDING" as const,
              })),
            }),
          ]
        : []),
    ]);

    await recomputeShopKycStatus(shop.id);
    return shopOk({ shop_id: shop.id, count: items.length, max_items: MAX_ITEMS }, "Products KYC saved");
  } catch (err) {
    console.error("[shop/products_kyc]", err);
    return shopServerError();
  }
}
