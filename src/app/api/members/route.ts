import { NextResponse } from "next/server";
import { put, list } from "@vercel/blob";
import initialMembers from "@/data/members.json";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Member {
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

const BLOB_FILENAME = "ganesh_heritage_members.json";
const VALID_BLOCKS = new Set(["A", "B", "C", "D"]);

// Helper to sanitize and normalize phone numbers
function cleanPhoneNumber(raw: string): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  // If user entered with 91 prefix (12 digits)
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  // If user entered with leading 0 (11 digits)
  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1);
  }
  return digits.slice(-10);
}

// Merge helper to guarantee all 224 flats are always present and never corrupted
function mergeAndPreserveAllFlats(current: Member[]): Member[] {
  const flatMap = new Map<string, Member>();
  
  // Baseline 224 flats
  (initialMembers as Member[]).forEach((m) => {
    flatMap.set(m.id, m);
  });

  // Overlay current records if valid
  if (Array.isArray(current)) {
    current.forEach((m) => {
      if (m && m.id && flatMap.has(m.id)) {
        flatMap.set(m.id, {
          ...flatMap.get(m.id)!,
          ...m,
        });
      }
    });
  }

  return Array.from(flatMap.values());
}

async function getMembersFromBlob(): Promise<Member[]> {
  try {
    const { blobs } = await list({ prefix: BLOB_FILENAME });
    const existingBlob = blobs.find((b) => b.pathname === BLOB_FILENAME);

    if (existingBlob) {
      const fetchUrl = existingBlob.downloadUrl || `${existingBlob.url}?download=1`;
      const res = await fetch(`${fetchUrl}&_nocache=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return mergeAndPreserveAllFlats(data);
        }
      }
    }

    // Initialize blob if not found
    const initialList = mergeAndPreserveAllFlats(initialMembers as Member[]);
    try {
      await put(BLOB_FILENAME, JSON.stringify(initialList, null, 2), {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
      });
    } catch (putErr) {
      console.warn("Could not put initial blob:", putErr);
    }
    return initialList;
  } catch (error) {
    console.error("Error fetching from Vercel Blob:", error);
    return mergeAndPreserveAllFlats(initialMembers as Member[]);
  }
}

export async function GET() {
  try {
    const members = await getMembersFromBlob();
    return NextResponse.json(members, {
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

    const currentMembers = await getMembersFromBlob();
    const id = `${cleanBlock}-${cleanFlat}`;
    const floor =
      parseInt(cleanFlat.length > 2 ? cleanFlat.slice(0, -2) : cleanFlat[0], 10) || 1;
    
    // Sanitize fields and impose reasonable character limits
    const cleanName = String(name || "").trim().slice(0, 100);
    const cleanPhone = cleanPhoneNumber(String(phone || ""));
    const cleanDetails = String(additionalDetails || "").trim().slice(0, 500);
    const isOccupied = Boolean(cleanName || cleanPhone);

    const record: Member = {
      id,
      block: cleanBlock,
      flatNo: cleanFlat,
      floor,
      name: cleanName,
      phone: cleanPhone,
      status: isOccupied ? "Occupied" : "Vacant",
      additionalDetails: cleanDetails,
      updatedAt: new Date().toISOString(),
    };

    const existingIndex = currentMembers.findIndex((m) => m.id === id);
    if (existingIndex !== -1) {
      currentMembers[existingIndex] = {
        ...currentMembers[existingIndex],
        ...record,
      };
    } else {
      currentMembers.push(record);
    }

    const finalMerged = mergeAndPreserveAllFlats(currentMembers);

    // Save updated members back to Vercel Blob
    try {
      await put(BLOB_FILENAME, JSON.stringify(finalMerged, null, 2), {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
      });
    } catch (putError) {
      console.error("Vercel Blob put error:", putError);
      // Still return the updated record so the user gets instant local success
    }

    return NextResponse.json({ success: true, member: record });
  } catch (error) {
    console.error("Error saving member:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
