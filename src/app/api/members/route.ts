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

async function getMembersFromBlob(): Promise<Member[]> {
  try {
    const { blobs } = await list({ prefix: BLOB_FILENAME });
    const existingBlob = blobs.find((b) => b.pathname === BLOB_FILENAME);

    if (existingBlob) {
      // Use downloadUrl (?download=1) to ensure latest uncached content from Vercel Blob
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
          return data;
        }
      }
    }

    // Initialize blob if not found
    await put(BLOB_FILENAME, JSON.stringify(initialMembers, null, 2), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return initialMembers as Member[];
  } catch (error) {
    console.error("Error fetching/initializing Vercel Blob:", error);
    return initialMembers as Member[];
  }
}

export async function GET() {
  const members = await getMembersFromBlob();
  return NextResponse.json(members, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { block, flatNo, name, phone, additionalDetails } = body;

    if (!block || !flatNo) {
      return NextResponse.json(
        { error: "Block and Flat number are required" },
        { status: 400 }
      );
    }

    const currentMembers = await getMembersFromBlob();
    const cleanBlock = String(block).toUpperCase().trim();
    const cleanFlat = String(flatNo).trim();
    const id = `${cleanBlock}-${cleanFlat}`;
    const floor =
      parseInt(cleanFlat.length > 2 ? cleanFlat.slice(0, -2) : cleanFlat[0], 10) || 1;
    const cleanName = (name || "").trim();
    const cleanPhone = (phone || "").trim().replace(/\D/g, "").slice(-10);
    const isOccupied = Boolean(cleanName || cleanPhone);

    const record: Member = {
      id,
      block: cleanBlock,
      flatNo: cleanFlat,
      floor,
      name: cleanName,
      phone: cleanPhone,
      status: isOccupied ? "Occupied" : "Vacant",
      additionalDetails: (additionalDetails || "").trim(),
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

    // Save updated members back to Vercel Blob
    await put(BLOB_FILENAME, JSON.stringify(currentMembers, null, 2), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    return NextResponse.json({ success: true, member: record });
  } catch (error) {
    console.error("Error saving member to Vercel Blob:", error);
    return NextResponse.json(
      { error: "Failed to save member details" },
      { status: 500 }
    );
  }
}
