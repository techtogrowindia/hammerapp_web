const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

// Service categories now come from SERVICE_TAXONOMY (Work Wise Category) below.

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

// Bulk services catalog (50+ services with categories/subcategories from screenshot).
const SERVICE_CATALOG = [
  { cat: "Construction Material", sub: "Stone", srv: "Jully / Chips", tax: 5 },
  { cat: "Construction Material", sub: "Sand", srv: "River Sand / Filling Sand /Red Sand Cravel", tax: 5 },
  { cat: "Construction Material", sub: "Sand", srv: "M Sand /P Sand", tax: 5 },
  { cat: "Construction Material", sub: "iron Rods", srv: "Roofing Sheets", tax: 18 },
  { cat: "Construction Material", sub: "iron Rods", srv: "Structural Sections (Open Profiles) TMT", tax: 18 },
  { cat: "Construction Material", sub: "iron Rods", srv: "Metal Sheets & Plates", tax: 18 },
  { cat: "Construction Material", sub: "iron Rods", srv: "Hollow Structural Sections (Pipes & Tubes)", tax: 18 },
  { cat: "Construction Material", sub: "Bricks", srv: "Interlocking Bricks", tax: 12 },
  { cat: "Construction Material", sub: "Bricks", srv: "Hollow Bricks / Hollow Blocks", tax: 12 },
  { cat: "Construction Material", sub: "Bricks", srv: "Concrete / Cement Bricks", tax: 12 },
  { cat: "Construction Material", sub: "Bricks", srv: "AAC Blocks", tax: 12 },
  { cat: "Construction Material", sub: "Bricks", srv: "Fly Ash Bricks", tax: 12 },
  { cat: "Construction Material", sub: "Bricks", srv: "Red Clay Bricks", tax: 12 },
  { cat: "Welding Works", sub: "SS Steel New & Repair Work", srv: "Stainless Steel New & Repair work", tax: 18 },
  { cat: "Welding Works", sub: "New Shed Works", srv: "Repair/New Works", tax: 18 },
  { cat: "Welding Works", sub: "Grill / New Gate New /Repair Works", srv: "Iron Grill & Gate Work", tax: 18 },
  { cat: "Computer & Laptop Services", sub: "Software services", srv: "BSOD & Slow Performance/Lagging/System Freezing/Hanging", tax: 18 },
  { cat: "Computer & Laptop Services", sub: "Hardware Services", srv: "Power issues & Screen/Display Damage", tax: 18 },
  { cat: "Commercial Cargo Vehicle", sub: "Load Vehicle Large", srv: "Lorry & Containers", tax: 18 },
  { cat: "Plumbing", sub: "New Works & Installation", srv: "Water Heater/Under Ground/Rough-In/Water Supply/External Piping(Main Line, Rain Water)/Pressure Pump/New Internal & External Piping", tax: 18 },
  { cat: "Plumbing", sub: "Maintenance & Repair Works", srv: "Tap Leakage /Line Blockage/Pipe Replacement/Pressure Pump/Toilet Repair/Borewell Pipe Repair", tax: 18 },
  { cat: "Carpentry", sub: "Office Chair Repair", srv: "Rolling Chair & Hydraulic Chair Repair", tax: 18 },
  { cat: "Blood Diagnosis", sub: "Lab Tests", srv: "Basic & Advance Blood Test", tax: 0 },
  { cat: "Home Appliances Repair & Rewinding", sub: "Small Appliances", srv: "TV/Fan/Sound System/ Water Heater/Iron Box/Vacuum Cleaner/Stabilizer", tax: 18 },
  { cat: "Home Appliances Repair & Rewinding", sub: "Rewinding Works", srv: "Fan/Water Pump/Sub Motor/Grinder/Mixer", tax: 18 },
  { cat: "Home Appliances Repair & Rewinding", sub: "Large Appliances", srv: "Washing Machine/Dishwasher Machine", tax: 18 },
  { cat: "Carpentry", sub: "UPVC Work / Mosquito Netting", srv: "UPVC Doors / Windows", tax: 18 },
  { cat: "Home Appliances Repair & Rewinding", sub: "Kitchen Appliances", srv: "Gas Stove/Induction/Blender/Mixer/Wet Grinder/Air Fryer/Microwave Oven", tax: 18 },
  { cat: "Carpentry", sub: "New Work", srv: "Door Set / Ward robe / Furniture", tax: 18 },
  { cat: "Carpentry", sub: "Carving Work", srv: "Hand / Machine Work", tax: 18 },
  { cat: "Cleaning Services", sub: "Water Tank Cleaning", srv: "Water & Sump Cleaning", tax: 18 },
  { cat: "Cleaning Services", sub: "Septic Tank/Drainage Cleaning", srv: "Septic Tank Cleaning & Blockage Cleaning", tax: 18 },
  { cat: "Cleaning Services", sub: "Kitchen Cleaning", srv: "Floor & Wall Tiles Cleaning/Cooking Utilities Exhaust Fan", tax: 18 },
  { cat: "Cleaning Services", sub: "General & Deep Home Cleaning Services", srv: "Floor/Dust/Window/Fan/Wall Cleaning", tax: 18 },
  { cat: "Cleaning Services", sub: "Garden & lawn cleaning", srv: "Waste Removal/Vegetation Cleaning", tax: 18 },
  { cat: "Cleaning Services", sub: "Chimney Cleaning", srv: "Filter Deep Cleaning/Internal Blower & fan/Oil Tray Cleaning Services", tax: 18 },
  { cat: "Cleaning Services", sub: "Bathroom Cleaning", srv: "Closet/Tile/Tap Cleaning", tax: 18 },
  { cat: "Carpentry", sub: "Basic Repair Works", srv: "Door / Window / Cupboard / Furniture", tax: 18 },
  { cat: "Painting & Decor", sub: "Wood Polish", srv: "Doors Furniture Polishing Service", tax: 18 },
  { cat: "Painting & Decor", sub: "Texture Painting", srv: "Venetian/Spatula/Stippling Services", tax: 18 },
  { cat: "Tailoring", sub: "Ladies", srv: "Hand / Machine Embroidery", tax: 5 },
  { cat: "Painting & Decor", sub: "Metal Painting", srv: "Grill/Gate Painting", tax: 18 },
  { cat: "Tailoring", sub: "Kids", srv: "Uniform / Silk Skirt", tax: 5 },
  { cat: "Air Conditioner", sub: "Ductable(Central) AC", srv: "General Service/Indoor Unit & Air Handling(FCU)/Evaporator Coil Cleaning/Blower & Fan Assembly", tax: 18 },
  { cat: "Air Conditioner", sub: "Portable AC", srv: "General Service/Filter Cleaning/Cooling & Compressor Issues/Exhaust Hose Inspection", tax: 18 },
  { cat: "Tailoring", sub: "Ladies", srv: "Kurti / Churidar / Patiala / Over Coat", tax: 5 },
  { cat: "Air Conditioner", sub: "Split AC", srv: "General Service/Indoor & Outdoor Cleaning Services/Cooling & Compressor Issues", tax: 18 },
  { cat: "Tailoring", sub: "Ladies Premium", srv: "Bridal Blouse / Aari Work", tax: 18 },
  { cat: "Air Conditioner", sub: "Window AC", srv: "General Service/Filter Cleaning/Cooling & Compressor Issues", tax: 18 },
  { cat: "Tailoring", sub: "Ladies", srv: "Regular Blouse Stitching / Alteration works", tax: 5 },
];

async function main() {
  console.log("🌱 Seeding master data...");

  for (const name of BLOOD_GROUPS) {
    await prisma.bloodGroup.upsert({ where: { name }, create: { name }, update: {} });
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

  // Bulk load services catalog.
  const catCache = {}; // {catName} -> id
  for (const item of SERVICE_CATALOG) {
    // Ensure category.
    if (!catCache[item.cat]) {
      const c = await prisma.serviceCategory.upsert({
        where: { name: item.cat },
        create: { name: item.cat },
        update: {},
      });
      catCache[item.cat] = c.id;
    }
    // Ensure subcategory.
    const sc = await prisma.serviceSubcategory.upsert({
      where: { serviceCategoryId_name: { serviceCategoryId: catCache[item.cat], name: item.sub } },
      create: { serviceCategoryId: catCache[item.cat], name: item.sub },
      update: {},
    });
    // Upsert service (by category + subcategory + name).
    await prisma.service.upsert({
      where: {
        serviceCategoryId_serviceSubcategoryId_name: {
          serviceCategoryId: catCache[item.cat],
          serviceSubcategoryId: sc.id,
          name: item.srv,
        },
      },
      create: {
        serviceCategoryId: catCache[item.cat],
        serviceSubcategoryId: sc.id,
        name: item.srv,
        taxPercent: item.tax,
      },
      update: { taxPercent: item.tax },
    });
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
