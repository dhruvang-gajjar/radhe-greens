import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

interface MemberData {
  id: string;
  block: string;
  flatNo: string;
  floor: number;
  name: string;
  phone: string;
  status: string;
  residentType?: string;
  additionalDetails?: string;
  updatedAt?: string;
}

async function main() {
  console.log("🌱 Starting Ganesh Heritage database seeding...");

  // Prefer the live snapshot if available, otherwise fall back to members.json
  const snapshotPath = path.join(__dirname, "../src/data/live_members_snapshot.json");
  const fallbackPath = path.join(__dirname, "../src/data/members.json");
  const dataFilePath = fs.existsSync(snapshotPath) ? snapshotPath : fallbackPath;

  console.log(`Loading data from: ${dataFilePath}`);
  const raw = fs.readFileSync(dataFilePath, "utf8");
  const members: MemberData[] = JSON.parse(raw);

  console.log(`Found ${members.length} member records to seed/upsert.`);

  let inserted = 0;
  let updated = 0;

  for (const m of members) {
    const isOccupied = Boolean(m.name?.trim() || m.phone?.trim());
    const res = await prisma.member.upsert({
      where: { id: m.id },
      update: {
        block: m.block,
        flatNo: String(m.flatNo),
        floor: Number(m.floor),
        name: (m.name || "").trim(),
        phone: (m.phone || "").trim(),
        status: isOccupied ? "Occupied" : "Vacant",
        residentType: (m.residentType || "").trim(),
        additionalDetails: (m.additionalDetails || "").trim(),
      },
      create: {
        id: m.id,
        block: m.block,
        flatNo: String(m.flatNo),
        floor: Number(m.floor),
        name: (m.name || "").trim(),
        phone: (m.phone || "").trim(),
        status: isOccupied ? "Occupied" : "Vacant",
        residentType: (m.residentType || "").trim(),
        additionalDetails: (m.additionalDetails || "").trim(),
      },
    });

    if (res.name || res.phone) {
      updated++;
    } else {
      inserted++;
    }
  }

  console.log(
    `✅ Seeding finished successfully! Total flats: ${members.length} (${updated} occupied, ${inserted} vacant).`
  );
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
