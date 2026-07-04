const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

const SERVICE_CATEGORIES = [
  { name: "Electrical", description: "Wiring, fixtures, panels" },
  { name: "Plumbing", description: "Pipes, taps, drainage" },
  { name: "AC Repair", description: "Installation & servicing" },
  { name: "Carpentry", description: "Furniture & fittings" },
  { name: "Appliance Repair", description: "Home appliances" },
];

const REJECT_REASONS = [
  { reason: "Document unclear / unreadable", category: "DOCUMENT" },
  { reason: "Name mismatch with ID proof", category: "PROFILE" },
  { reason: "Invalid bank account details", category: "BANK" },
  { reason: "GST number could not be verified", category: "COMPANY" },
  { reason: "Certificate not valid for selected service", category: "SERVICE" },
];

const BADGES = [
  { name: "Verified", color: "#22c55e" },
  { name: "Top Rated", color: "#e67e22" },
  { name: "New", color: "#3b82f6" },
];

// Services taxonomy (Category → Subcategory) from "Work Wise Category.xlsx".
// Individual leaf Services (with tax %) are added by admins via the UI.
const SERVICE_TAXONOMY = [
  { name: "Electrician", subs: ["New Wiring", "Repair Works", "Profile Lighting", "EB Meter Check"] },
  { name: "Plumbing", subs: ["New Work", "Repair Works", "Water Pipe Cleaning"] },
  { name: "CCTV", subs: ["New Work", "Repair Works"] },
  { name: "AC Services", subs: ["New Work", "Repair Works", "Shifting Work"] },
  { name: "Painting", subs: ["Wall Painting", "Metal Painting", "Wood Polish", "Furniture Painting", "Water Proofing", "Wall Decorators"] },
  { name: "Carpenter", subs: ["Door/Window New Work", "Door/Window Repair Work", "Furniture New Work", "Furniture Repair Work", "Plywood New Work", "Plywood Repair Work", "Carving Works"] },
  { name: "Water Purifier", subs: ["Water Purifier New Installation", "Water Purifier Repair Work", "Water Softener Installation", "Water Softener Maintenance"] },
  { name: "Cleaning Services", subs: ["Full Home Cleaning", "Full Bathroom Cleaning", "Bathroom Closet Cleaning", "Bathroom Closet / Tiles Cleaning", "Kitchen Cleaning", "Water Tank Cleaning", "Septic Tank Cleaning", "Drainage Block Removal", "Chimney Cleaning"] },
  { name: "Borewell", subs: ["Handbore Well Services New", "Machine Borewell Services New", "Borewell Cleaning"] },
  { name: "Cab Services", subs: ["Acting Driver Car", "Heavy Vehicle Drivers", "Cab Booking Services", "Van Booking Services", "Bus Booking Services", "Load Vehicles Mini", "Load Vehicles Large"] },
  { name: "Pest Control", subs: ["New Building Services", "Old Building Services", "Mosquito Net Services"] },
  { name: "UPS & Battery", subs: ["UPS New Installation", "UPS Service & Maintenance", "UPS New Wiring Services", "Battery Replacement"] },
  { name: "Solar", subs: ["Solar New Installation", "Solar Maintenance Ongrid", "Solar Maintenance Offgrid", "Solar Waterheaters New Installation", "Solar Waterheaters Maintenance"] },
  { name: "Home Appliance Repair", subs: ["Mixee", "Grinder", "Microwave Oven", "Fridge", "Water Heater", "Fan", "Chimney", "TV", "Washing Machine", "Dish Washer", "DTH", "Vacuum Cleaner"] },
  { name: "Home Appliance Installation", subs: ["AC", "Chimney", "Washing Machine", "Dish Washer", "DTH", "TV", "Fan"] },
  { name: "Rewinding Works", subs: ["Fan", "Motor", "Mixee", "Submersible Motors"] },
  { name: "Labs & Medicine", subs: ["Routine Blood Check", "General Blood Check", "Dr Prescribed Blood Check", "Master Blood Check Up", "Physiotherapist Home Visit", "Home Care Staff Nurses", "Monthly Regular Medicines"] },
  { name: "Building & Construction", subs: ["New Building Planner", "Elevation Planner", "Home Loan Estimates", "Electrical Drawing", "Valuation Engineer", "Home Lifting Services", "Renovation Work", "Interior Decorator", "Home Automation", "Gardening"] },
];

// Shop product categories (max 3 selectable per shop) + sample subcategories.
const PRODUCT_CATEGORIES = [
  { name: "Electrical", subs: ["Wires & Cables", "Switches & Sockets", "Lighting", "MCB & Distribution"] },
  { name: "Plumbing", subs: ["Pipes & Fittings", "Taps & Faucets", "Sanitaryware", "Water Tanks"] },
  { name: "Hardware & Tools", subs: ["Hand Tools", "Power Tools", "Fasteners", "Safety Gear"] },
  { name: "Paints & Coatings", subs: ["Interior Paints", "Exterior Paints", "Primers", "Brushes & Rollers"] },
  { name: "Building Material", subs: ["Cement", "Steel", "Bricks & Blocks", "Tiles"] },
  { name: "Home Appliances", subs: ["Fans", "Water Heaters", "Air Coolers", "Small Appliances"] },
];

async function main() {
  console.log("🌱 Seeding master data...");

  for (const name of BLOOD_GROUPS) {
    await prisma.bloodGroup.upsert({ where: { name }, create: { name }, update: {} });
  }

  for (const sc of SERVICE_CATEGORIES) {
    await prisma.serviceCategory.upsert({
      where: { name: sc.name },
      create: sc,
      update: { description: sc.description },
    });
  }

  // Service taxonomy: categories + subcategories (Work Wise Category.xlsx).
  for (const cat of SERVICE_TAXONOMY) {
    const category = await prisma.serviceCategory.upsert({
      where: { name: cat.name },
      create: { name: cat.name },
      update: {},
    });
    for (const subName of cat.subs) {
      await prisma.serviceSubcategory.upsert({
        where: { serviceCategoryId_name: { serviceCategoryId: category.id, name: subName } },
        create: { name: subName, serviceCategoryId: category.id },
        update: {},
      });
    }
  }

  for (const rr of REJECT_REASONS) {
    const exists = await prisma.rejectReason.findFirst({ where: { reason: rr.reason } });
    if (!exists) await prisma.rejectReason.create({ data: rr });
  }

  for (const b of BADGES) {
    await prisma.badge.upsert({ where: { name: b.name }, create: b, update: {} });
  }

  for (const pc of PRODUCT_CATEGORIES) {
    const cat = await prisma.productCategory.upsert({
      where: { name: pc.name },
      create: { name: pc.name },
      update: {},
    });
    for (const subName of pc.subs) {
      const existing = await prisma.productSubcategory.findFirst({
        where: { name: subName, productCategoryId: cat.id },
      });
      if (!existing) {
        await prisma.productSubcategory.create({
          data: { name: subName, productCategoryId: cat.id },
        });
      }
    }
  }

  const adminEmail = "admin@hammerapp.in";
  const password = await bcrypt.hash("Admin@123", 10);
  await prisma.admin.upsert({
    where: { email: adminEmail },
    create: { name: "Super Admin", email: adminEmail, password, role: "SUPER_ADMIN" },
    update: {},
  });

  console.log("✅ Seed complete. Admin login: admin@hammerapp.in / Admin@123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
