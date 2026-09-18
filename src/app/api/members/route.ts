import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import initialMembers from "@/data/members.json";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface MemberRecord {
  id: string;
  block: string;
  flatNo: string;
  floor: number;
  name: string;
  phone: string;
  status: "Occupied" | "Vacant";
  residentType?: string;
  additionalDetails?: string;
  updatedAt?: string;
}

const VALID_BLOCKS = new Set(["A", "B", "C", "D"]);

// Helper to sanitize and normalize phone numbers
function cleanPhoneNumber(raw: string): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1);
  }
  return digits.slice(-10);
}

export async function GET() {
  try {
    const dbMembers = await prisma.member.findMany({
      orderBy: [{ block: "asc" }, { floor: "asc" }, { flatNo: "asc" }],
    });

    if (!dbMembers || dbMembers.length === 0) {
      // Return baseline if database is empty/not yet seeded
      return NextResponse.json(initialMembers, {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      });
    }

    // Format fields for frontend compatibility
    const formatted: MemberRecord[] = dbMembers.map((m) => ({
      id: m.id,
      block: m.block,
      flatNo: m.flatNo,
      floor: m.floor,
      name: m.name || "",
      phone: m.phone || "",
      status: m.status === "Occupied" ? "Occupied" : "Vacant",
      residentType: m.residentType || "",
      additionalDetails: m.additionalDetails || "",
      updatedAt: m.updatedAt.toISOString(),
    }));

    return NextResponse.json(formatted, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (err) {
    console.error("GET /api/members error:", err);
    // Graceful fallback to baseline data - NEVER break or return 500
    return NextResponse.json(initialMembers, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { block, flatNo, name, phone, additionalDetails } = body;

    const cleanBlock = String(block || "").toUpperCase().trim();
    const cleanFlat = String(flatNo || "").trim();

    if (!VALID_BLOCKS.has(cleanBlock) || !cleanFlat) {
      return NextResponse.json(
        { error: "Invalid Block or Flat number" },
        { status: 400 }
      );
    }

    const id = `${cleanBlock}-${cleanFlat}`;
    const floor =
      parseInt(cleanFlat.length > 2 ? cleanFlat.slice(0, -2) : cleanFlat[0], 10) || 1;

    // Sanitize fields and impose reasonable character limits
    const cleanName = String(name || "").trim().slice(0, 100);
    const cleanPhone = cleanPhoneNumber(String(phone || ""));
    const cleanDetails = String(additionalDetails || "").trim().slice(0, 500);
    const isOccupied = Boolean(cleanName || cleanPhone);

    const record = await prisma.member.upsert({
      where: { id },
      update: {
        block: cleanBlock,
        flatNo: cleanFlat,
        floor,
        name: cleanName,
        phone: cleanPhone,
        status: isOccupied ? "Occupied" : "Vacant",
        additionalDetails: cleanDetails,
      },
      create: {
        id,
        block: cleanBlock,
        flatNo: cleanFlat,
        floor,
        name: cleanName,
        phone: cleanPhone,
        status: isOccupied ? "Occupied" : "Vacant",
        additionalDetails: cleanDetails,
      },
    });

    return NextResponse.json({
      success: true,
      member: {
        ...record,
        updatedAt: record.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error saving member to Prisma:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
