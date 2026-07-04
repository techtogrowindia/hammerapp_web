// Full leaf-services catalog (109 services) — authoritative list provided by ops.
// Run:  node prisma/seed-services.js
// Idempotent: clears existing leaf Services, then upserts category → subcategory → service.
// Safe to re-run. Categories/subcategories are upserted by name (never deleted here).
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// [category, subcategory, service name, tax %]
const SERVICES = [
  ["Construction Material", "Stone", "Jully / Chips", 5],
  ["Construction Material", "Sand", "River Sand / Filling Sand /Red Sand Cravel", 5],
  ["Construction Material", "Sand", "M Sand /P Sand", 5],
  ["Construction Material", "iron Rods", "Roofing Sheets", 18],
  ["Construction Material", "iron Rods", "Structural Sections (Open Profiles) TMT", 18],
  ["Construction Material", "iron Rods", "Metal Sheets & Plates", 18],
  ["Construction Material", "iron Rods", "Hollow Structural Sections (Pipes & Tubes)", 18],
  ["Construction Material", "Bricks", "Interlocking Bricks", 12],
  ["Construction Material", "Bricks", "Hollow Bricks / Hollow Blocks:", 12],
  ["Construction Material", "Bricks", "Concrete / Cement Bricks:", 12],
  ["Construction Material", "Bricks", "AAC Blocks", 12],
  ["Construction Material", "Bricks", "Fly Ash Bricks", 12],
  ["Construction Material", "Bricks", "Red Clay Bricks", 12],
  ["Welding Works", "SS Steel New & Repair Work", "Stainless Steel New & Repair work", 18],
  ["Welding Works", "New Shed Works", "Repair/New Works", 18],
  ["Welding Works", "Grill / New Gate New /Repair Works", "Iron Grill & Gate Work", 18],
  ["Computer & Laptop Services", "Software services", "BSOD & Slow Performance/Lagging/System Freezing/Hanging", 18],
  ["Computer & Laptop Services", "Hardware Services", "Power issues & Screen/Display Damage", 18],
  ["Commercial Cargo Vehicle", "Load Vehicle Large", "Lorry & Containers", 18],
  ["Plumbing", "New Works & Installation", "Water Heater/Under Ground/Rough-In/Water Supply/External Piping(Main Line, Rain Water)/Pressure Pump/New Internal & External Piping", 18],
  ["Plumbing", "Maintenance & Repair Works", "Tap Leakage /Line Blockage/Pipe Replacement/Pressure Pump/Toilet Repair/Borewell Pipe Repair", 18],
  ["Carpentry", "Office Chair Repair", "Rolling Chair & Hydraulic Chair Repair", 18],
  ["Blood Diagnosis", "Lab Tests", "Basic & Advance Blood Test", 0],
  ["Home Appliances Repair & Rewinding", "Small Appliances", "TV/Fan/Sound System/ Water Heater/Iron Box/Vacuum Cleaner/Stabilizer", 18],
  ["Home Appliances Repair & Rewinding", "Rewinding Works", "Fan/Water Pump/Sub Motor/Grinder/Mixer", 18],
  ["Home Appliances Repair & Rewinding", "Large Appliances", "Washing Machine/Dishwasher Machine", 18],
  ["Carpentry", "UPVC Work / Mosquito Netting", "UPVC Doors / Windows", 18],
  ["Home Appliances Repair & Rewinding", "Kitchen Appliances", "Gas Stove/Induction/Blender/Mixer/Wet Grinder/Air Fryer/Microwave Oven", 18],
  ["Carpentry", "New Work", "Door Set / Ward robe / Furniture", 18],
  ["Carpentry", "Carving Work", "Hand / Machine Work", 18],
  ["Cleaning Services", "Water Tank Cleaning", "Water & Sump Cleaning", 18],
  ["Cleaning Services", "Septic Tank/Drainage Cleaning", "Septic Tank Cleaning & Blockage Cleaning", 18],
  ["Cleaning Services", "Kitchen Cleaning", "Floor & Wall Tiles Cleaning/Cooking Utilities Exhaust Fan", 18],
  ["Cleaning Services", "General & Deep Home Cleaning Services", "Floor/Dust/Window/Fan/Wall Cleaning", 18],
  ["Cleaning Services", "Garden & lawn cleaning", "Waste Removal/Vegetation Cleaning", 18],
  ["Cleaning Services", "Chimney Cleaning", "Filter Deep Cleaning/Internal Blower & fan/Oil Tray Cleaning Services", 18],
  ["Cleaning Services", "Bathroom Cleaning", "Closet/Tile/Tap Cleaning", 18],
  ["Carpentry", "Basic Repair Works", "Door / Window / Cupboard / Furniture", 18],
  ["Painting & Decor", "Wood Polish", "Doors Furniture Polishing Service", 18],
  ["Painting & Decor", "Texture Painting", "Venetian/Spatula/Stippling Services", 18],
  ["Tailoring", "Ladies", "Hand / Machine Embroidery", 5],
  ["Painting & Decor", "Metal Painting", "Grill/Gate Painting", 18],
  ["Tailoring", "Kids", "Uniform / Silk Skirt /", 5],
  ["Air Conditioner", "Ductable(Central) AC", "General Service/Indoor Unit & Air Handling(FCU)/Evaporator Coil Cleaning/Blower & Fan Assembly", 18],
  ["Air Conditioner", "Portable AC", "General Service/Filter Cleaning/Cooling & Compressor Issues/Exhaust Hose Inspection", 18],
  ["Tailoring", "Ladies", "Kurti / Churidar / Patiala / Over Coat", 5],
  ["Air Conditioner", "Split AC", "General Service/Indoor & Outdoor Cleaning Services/Cooling & Compressor Issues", 18],
  ["Tailoring", "Ladies Premium", "Bridal Blouse / Aari Work", 18],
  ["Air Conditioner", "Window AC", "General Service/Filter Cleaning/Cooling & Compressor Issues", 18],
  ["Tailoring", "Ladies", "Regular Blouse Stitching / Alteration works", 5],
  ["Water Purifier", "Water Dispenser", "Hot & Cold/ Hot & Cold Purifier", 18],
  ["Tailoring", "Gents", "Company Uniforms", 5],
  ["Tailoring", "Gents Premium", "Safari/Suits", 5],
  ["Water Purifier", "Ro Water Purifier Services", "Routine Maintenance/ Membrane Change/TDS Balancing/Leakage & Electric Repairs", 18],
  ["Water Purifier", "Commercial RO Plant Services", "Commercial 25LPH,50LPH ,etc.", 18],
  ["Tailoring", "Gents", "Shirts/Pants Stiching", 5],
  ["Water Purifier", "Bore Water Softener", "Softener Services/Iron Remover", 18],
  ["Physiotherapist", "Male", "Pain Management (Back Pain/Arthritis)", 0],
  ["Physiotherapist", "Male", "Injury Rehabilitation (Post-Surgery, Sports Injury)", 0],
  ["Physiotherapist", "Female", "Injury Rehabilitation (Post-Surgery, Sports Injury)", 0],
  ["Physiotherapist", "Female", "Pain Management (Back Pain/Arthritis)", 0],
  ["Laundry & Ironing Service", "Premium Materials", "Carpet Cleaning", 18],
  ["Laundry & Ironing Service", "Washing & Ironing", "Regular Clothes Washing & Ironing", 5],
  ["Laundry & Ironing Service", "Regular Cloths Ironing", "Daily Use Cloths Ironing", 5],
  ["Laundry & Ironing Service", "Household Washing", "Bedsheet /Curtains", 5],
  ["Laundry & Ironing Service", "DRY Wash", "Silk Saree / Ethnic Wear Wash / Suites", 18],
  ["Electrician", "Smart Home / Sensors /Smart Equipment", "Smart Equipment Services", 18],
  ["Electrician", "Industrial ,Panels ,High Voltage Maintenance", "High Volt Industrial & Panels", 18],
  ["Electrician", "Commercial Wiring for offices and 3 Phase", "Wiring for Commercial Space With Panel", 18],
  ["Daycare Staff", "Care Taker Male", "Home Nursing (Skilled Medical Care )", 0],
  ["Daycare Staff", "Care Taker Female", "Home Nursing (Skilled Medical Care )", 0],
  ["Daycare Staff", "Care Taker Female", "Elder Care", 0],
  ["Daycare Staff", "Care Taker Female", "Patient Care (Non Medical )", 0],
  ["Daycare Staff", "Care Taker Female", "Baby Care Staff", 18],
  ["CCTV", "Installation / Service", "4G/5G Sim Camera", 18],
  ["CCTV", "Installation / Service", "Analog/HD-TVI Camera", 18],
  ["CCTV", "Installation / Service", "Wireless & Wifi Camera", 18],
  ["CCTV", "Installation / Service", "Solar Camera", 18],
  ["Grooming Services", "Female", "Mehandi & Nail Art", 5],
  ["Grooming Services", "Female", "Saree Draping", 5],
  ["Grooming Services", "Female", "Bridal & Party Make Up", 5],
  ["Grooming Services", "Female", "Basic / Advance Facial & Detan", 5],
  ["Grooming Services", "Female", "Manicure , Pedicure", 5],
  ["Grooming Services", "Male", "Facial & Detan", 5],
  ["Grooming Services", "Female", "Basic Hair Cut /Advanced Hair Cut /Layer Cut /Hair Treatment /Hair Coloring /Texture Service", 5],
  ["Grooming Services", "Male", "Haircut / Coloring/Beard Shave Trimming for Men", 5],
  ["Grooming Services", "Female", "Waxing / Threading", 5],
  ["Battery UPS & Solar", "Battery", "Bike & Car Battery", 18],
  ["Commercial Cargo Vehicle", "Load Vehicle Medium", "407 , Eicher Pro/AL Partner", 18],
  ["Commercial Cargo Vehicle", "Load Vehicle Mini", "Tata Ace Bada Dosth", 18],
  ["Travels", "Buses", "Ac & Non Ac Buses", 18],
  ["Travels", "Travel Van", "Van & Tempo Traveller", 18],
  ["Travels", "Cabs", "7 & 8 Seater", 18],
  ["Travels", "Cabs", "Mini & Sedan 4 seater", 18],
  ["Travels", "Auto", "Rental Auto", 18],
  ["Acting Driver", "Driver", "Commercial Drivers Tata Ace /Bada dosth", 18],
  ["Daycare Staff", "Care Taker Male", "Elder Care", 0],
  ["Daycare Staff", "Care Taker Male", "Patient Care (Non Medical)", 0],
  ["Borewell", "Borewell Motor", "Compressor Cleaning", 18],
  ["Borewell", "Borewell Motor", "Handbore Services", 18],
  ["Battery UPS & Solar", "Battery", "UPS Battery Maintenance and Services", 18],
  ["Battery UPS & Solar", "Solar", "Solar Pannel Sales & Service", 5],
  ["Painting & Decor", "Wall Painting", "Exterior Interior Wall Ceiling Patti & Painting", 18],
  ["Borewell", "Borewell Motor", "Machine Borewell Services", 18],
  ["CCTV", "Installation / Service", "IP Camera", 18],
  ["Water Purifier", "Ro Water Purifier Services", "Water Purifier Services", 0],
  ["Pest Control", "Pest Control", "Pest Control Services", 18],
  ["Electrician", "House Wiring & Repair Services", "Quick home Repairs", 18],
  ["Acting Driver", "Driver", "Acting Driver Cars", 18],
];

async function main() {
  console.log(`🌱 Seeding ${SERVICES.length} services...`);

  // No leaf services are referenced yet (0 TechnicianService / ServiceCertificate),
  // so it is safe to clear and reseed to exactly the authoritative list.
  const deleted = await prisma.service.deleteMany({});
  console.log(`   cleared ${deleted.count} existing services`);

  const catCache = {}; // name -> id
  const subCache = {}; // `${catId}::${name}` -> id

  for (const [catName, subName, srvName, tax] of SERVICES) {
    if (!catCache[catName]) {
      const c = await prisma.serviceCategory.upsert({
        where: { name: catName },
        create: { name: catName },
        update: {},
      });
      catCache[catName] = c.id;
    }
    const catId = catCache[catName];

    const subKey = `${catId}::${subName}`;
    if (!subCache[subKey]) {
      const sc = await prisma.serviceSubcategory.upsert({
        where: { serviceCategoryId_name: { serviceCategoryId: catId, name: subName } },
        create: { serviceCategoryId: catId, name: subName },
        update: {},
      });
      subCache[subKey] = sc.id;
    }
    const subId = subCache[subKey];

    await prisma.service.upsert({
      where: {
        serviceCategoryId_serviceSubcategoryId_name: {
          serviceCategoryId: catId,
          serviceSubcategoryId: subId,
          name: srvName,
        },
      },
      create: { serviceCategoryId: catId, serviceSubcategoryId: subId, name: srvName, taxPercent: tax },
      update: { taxPercent: tax },
    });
  }

  const total = await prisma.service.count();
  const cats = Object.keys(catCache).length;
  console.log(`✅ Done. ${total} services across ${cats} categories.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
