import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { defaultMembers } from "@/lib/storage";
import { societyConfig, isValidBlock, parseFloorFromFlat } from "@/config/society";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface FamilyContact {
  name: string;
  phone: string;
  relation?: string;
}

interface VehicleRecord {
  regNo: string;
  type?: "Car" | "Bike" | "Other";
}

interface MemberRecord {
  id: string;
  block: string;
  flatNo: string;
  floor: number;
  name: string;
  phone: string;
  status: "Occupied" | "Vacant";
  residentType: string;
  ownerName: string;
  ownerPhone: string;
  additionalDetails: string;
  familyMembers: FamilyContact[];
  vehicles: VehicleRecord[];
  updatedAt: string;
}

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
    const currentSlug = societyConfig.storage.slug;
    const dbMembers = await prisma.member.findMany({
      where: {
        societyId: currentSlug,
      },
      orderBy: [{ block: "asc" }, { floor: "asc" }, { flatNo: "asc" }],
    });

    if (!dbMembers || dbMembers.length === 0) {
      // New project / empty database: return blank/vacant baseline for this society
      return NextResponse.json(defaultMembers, {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      });
    }

    // Format fields for frontend compatibility
    const formatted: MemberRecord[] = dbMembers.map((m) => {
      let family: FamilyContact[] = [];
      if (Array.isArray(m.familyMembers)) {
        family = m.familyMembers as unknown as FamilyContact[];
      } else if (typeof m.familyMembers === "string") {
        try {
          family = JSON.parse(m.familyMembers);
        } catch {
          family = [];
        }
      }

      let vehicles: VehicleRecord[] = [];
      if (Array.isArray(m.vehicles)) {
        vehicles = m.vehicles as unknown as VehicleRecord[];
      } else if (typeof m.vehicles === "string") {
        try {
          vehicles = JSON.parse(m.vehicles);
        } catch {
          vehicles = [];
        }
      }

      return {
        id: `${m.block}-${m.flatNo}`,
        block: m.block,
        flatNo: m.flatNo,
        floor: m.floor,
        name: m.name || "",
        phone: m.phone || "",
        status: m.status === "Occupied" ? "Occupied" : "Vacant",
        residentType: m.residentType || "Owner",
        ownerName: m.ownerName || "",
        ownerPhone: m.ownerPhone || "",
        additionalDetails: m.additionalDetails || "",
        familyMembers: family,
        vehicles,
        updatedAt: m.updatedAt.toISOString(),
      };
    });

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
    return NextResponse.json(defaultMembers, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { block, flatNo, name, phone, residentType, ownerName, ownerPhone, additionalDetails, familyMembers, vehicles } = body;

    const cleanBlock = String(block || "").toUpperCase().trim();
    const cleanFlat = String(flatNo || "").trim();

    if (!isValidBlock(cleanBlock) || !cleanFlat) {
      return NextResponse.json(
        { error: "Invalid Block or Flat number" },
        { status: 400 }
      );
    }

    const currentSlug = societyConfig.storage.slug;
    const isDefaultGanesh = currentSlug === "ganesh_heritage" || currentSlug === "gh";
    const dbId = isDefaultGanesh ? `${cleanBlock}-${cleanFlat}` : `${currentSlug}-${cleanBlock}-${cleanFlat}`;
    const floor = parseFloorFromFlat(cleanFlat);

    // If editing is disabled for this society, do not allow overwriting an occupied flat
    if (!societyConfig.allowEdit) {
      const existing = await prisma.member.findUnique({ where: { id: dbId } });
      const isAlreadyOccupied =
        existing &&
        (existing.status === "Occupied" ||
          Boolean(
            existing.name ||
              existing.phone ||
              (Array.isArray(existing.familyMembers) && (existing.familyMembers as unknown[]).length > 0) ||
              (Array.isArray(existing.vehicles) && (existing.vehicles as unknown[]).length > 0)
          ));

      if (isAlreadyOccupied) {
        return NextResponse.json(
          { error: "Editing existing flat records is disabled for this society" },
          { status: 403 }
        );
      }
    }

    // Sanitize fields and impose reasonable character limits
    const cleanName = String(name || "").trim().slice(0, 100);
    const cleanPhone = cleanPhoneNumber(String(phone || ""));
    const cleanDetails = String(additionalDetails || "").trim().slice(0, 500);
    const cleanResidentType = residentType === "Tenant" ? "Tenant" : "Owner";
    const cleanOwnerName = cleanResidentType === "Tenant" ? String(ownerName || "").trim().slice(0, 100) : "";
    const cleanOwnerPhone = cleanResidentType === "Tenant" ? cleanPhoneNumber(String(ownerPhone || "")) : "";

    const rawFamily = Array.isArray(familyMembers) ? familyMembers : [];
    const cleanFamily = rawFamily
      .slice(0, societyConfig.limits.maxFamilyMembersPerFlat)
      .map((f: { name?: string; phone?: string; relation?: string }) => ({
        name: String(f.name || "").trim().slice(0, 100),
        phone: cleanPhoneNumber(String(f.phone || "")),
        relation: String(f.relation || "").trim().slice(0, 50),
      }))
      .filter((f: { name: string; phone: string }) => Boolean(f.name || f.phone));

    const rawVehicles = Array.isArray(vehicles) ? vehicles : [];
    const cleanVehicles = rawVehicles
      .slice(0, societyConfig.limits.maxVehiclesPerFlat)
      .map((v: { regNo?: string; type?: string }) => ({
        regNo: String(v.regNo || "").toUpperCase().trim().slice(0, 20),
        type: (["Car", "Bike", "Other"].includes(String(v.type)) ? v.type : "Car") as "Car" | "Bike" | "Other",
      }))
      .filter((v: { regNo: string }) => Boolean(v.regNo));

    const isOccupied = Boolean(cleanName || cleanPhone || cleanFamily.length > 0 || cleanVehicles.length > 0);

    const record = await prisma.member.upsert({
      where: { id: dbId },
      update: {
        societyId: currentSlug,
        block: cleanBlock,
        flatNo: cleanFlat,
        floor,
        name: cleanName,
        phone: cleanPhone,
        status: isOccupied ? "Occupied" : "Vacant",
        residentType: cleanResidentType,
        ownerName: cleanOwnerName,
        ownerPhone: cleanOwnerPhone,
        additionalDetails: cleanDetails,
        familyMembers: cleanFamily,
        vehicles: cleanVehicles,
      },
      create: {
        id: dbId,
        societyId: currentSlug,
        block: cleanBlock,
        flatNo: cleanFlat,
        floor,
        name: cleanName,
        phone: cleanPhone,
        status: isOccupied ? "Occupied" : "Vacant",
        residentType: cleanResidentType,
        ownerName: cleanOwnerName,
        ownerPhone: cleanOwnerPhone,
        additionalDetails: cleanDetails,
        familyMembers: cleanFamily,
        vehicles: cleanVehicles,
      },
    });

    return NextResponse.json({
      success: true,
      member: {
        ...record,
        id: `${cleanBlock}-${cleanFlat}`,
        updatedAt: record.updatedAt.toISOString(),
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("POST /api/members error:", err);
    return NextResponse.json(
      {
        error: "Failed to save member details",
        details: errorMsg,
      },
      { status: 500 }
    );
  }
}
