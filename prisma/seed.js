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

  for (const rr of REJECT_REASONS) {
    const exists = await prisma.rejectReason.findFirst({ where: { reason: rr.reason } });
    if (!exists) await prisma.rejectReason.create({ data: rr });
  }

  for (const b of BADGES) {
    await prisma.badge.upsert({ where: { name: b.name }, create: b, update: {} });
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
