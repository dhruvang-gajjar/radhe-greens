import initialMembers from "@/data/members.json";
import { societyConfig, generateAllSocietyFlats, parseFloorFromFlat } from "@/config/society";

export interface FamilyMember {
  name: string;
  phone: string;
  relation?: string;
}

export interface Vehicle {
  regNo: string;
  type?: "Car" | "Bike" | "Other";
}

export interface Member {
  id: string;
  block: string;
  flatNo: string;
  floor: number;
  name: string;
  phone: string;
  status: "Occupied" | "Vacant";
  residentType?: "Owner" | "Tenant" | string;
  ownerName?: string;
  ownerPhone?: string;
  additionalDetails?: string;
  familyMembers?: FamilyMember[];
  vehicles?: Vehicle[];
  updatedAt?: string;
}

// Helper to sanitize phone numbers
export function cleanPhoneNumber(raw: string): string {
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

function buildDefaultMembers(): Member[] {
  const generated = generateAllSocietyFlats();
  const initialMap = new Map<string, any>();
  if (Array.isArray(initialMembers)) {
    initialMembers.forEach((m: any) => {
      if (m && m.id) initialMap.set(String(m.id).toUpperCase(), m);
    });
  }

  return generated.map((gf) => {
    const existing = initialMap.get(gf.id.toUpperCase());
    if (existing) {
      return {
        ...existing,
        id: gf.id,
        block: gf.block,
        flatNo: gf.flatNo,
        floor: gf.floor,
        residentType: existing.residentType || "Owner",
        ownerName: existing.ownerName || "",
        ownerPhone: existing.ownerPhone || "",
      };
    }
    return {
      id: gf.id,
      block: gf.block,
      flatNo: gf.flatNo,
      floor: gf.floor,
      name: "",
      phone: "",
      status: "Vacant",
      residentType: "Owner",
      ownerName: "",
      ownerPhone: "",
      additionalDetails: "",
      familyMembers: [],
      vehicles: [],
    };
  });
}

export const defaultMembers: Member[] = buildDefaultMembers();

const STORAGE_KEY = societyConfig.storage.localStorageKey;
const UPDATE_EVENT = societyConfig.storage.updateEvent;

// In-memory cache shared across the client application session
let memoryMembers: Member[] | null = null;
const listeners = new Set<(members: Member[]) => void>();

export function subscribeMembers(cb: (members: Member[]) => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

// Guarantee all flats for society exist and are never lost
function mergeWithBaseline(records: Member[]): Member[] {
  const map = new Map<string, Member>();
  defaultMembers.forEach((m) => map.set(m.id, m));
  if (Array.isArray(records)) {
    records.forEach((m) => {
      if (m && m.id) {
        if (map.has(m.id)) {
          map.set(m.id, { ...map.get(m.id)!, ...m });
        } else {
          map.set(m.id, m);
        }
      }
    });
  }
  return Array.from(map.values());
}

function broadcastUpdate(updatedList: Member[]) {
  memoryMembers = mergeWithBaseline(updatedList);
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryMembers));
      window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: memoryMembers }));
    } catch (e) {
      // Safe fallback if private browsing or storage quota exceeded
      console.warn("localStorage write failed (private mode or full):", e);
    }
  }
  listeners.forEach((listener) => {
    try {
      listener(memoryMembers!);
    } catch (e) {
      console.error("Listener error:", e);
    }
  });
}

// Get current members (memory -> localStorage -> default baseline)
export function getMembers(): Member[] {
  if (memoryMembers && memoryMembers.length > 0) {
    return memoryMembers;
  }

  if (typeof window === "undefined") {
    return defaultMembers;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryMembers = mergeWithBaseline(parsed);
        return memoryMembers;
      }
    }
  } catch (e) {
    console.warn("localStorage read failed:", e);
  }

  memoryMembers = [...defaultMembers];
  return memoryMembers;
}

// Fetch live member data from cloud database with automatic fallback
export async function fetchLiveMembers(): Promise<Member[]> {
  try {
    const res = await fetch("/api/members", {
      cache: "no-store",
      headers: { Pragma: "no-cache" },
    });
    if (!res.ok) {
      return getMembers();
    }
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      broadcastUpdate(data);
      return memoryMembers || data;
    }
  } catch (err) {
    console.warn("Live cloud sync failed, using cached baseline:", err);
  }
  return getMembers();
}

// Synchronous local update + asynchronous cloud persistence
export function saveMemberCloud(data: {
  block: string;
  flatNo: string;
  name: string;
  phone?: string;
  residentType?: string;
  ownerName?: string;
  ownerPhone?: string;
  additionalDetails?: string;
  familyMembers?: FamilyMember[];
  vehicles?: Vehicle[];
}): Member {
  // 1. Instant local persistence for zero perceived latency
  const localRecord = saveMember(data);

  // 2. Non-blocking cloud persistence
  fetch("/api/members", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).catch((err) => {
    console.warn("Background cloud sync deferred/offline:", err);
  });

  return localRecord;
}

export function findMember(
  block: string,
  flatNo: string,
  list: Member[] = getMembers()
): Member | undefined {
  const id = `${String(block).toUpperCase().trim()}-${String(flatNo).trim()}`;
  return list.find(
    (m) =>
      m.id.toUpperCase() === id ||
      (m.block.toUpperCase() === block.toUpperCase() && String(m.flatNo) === String(flatNo))
  );
}

// Immediate synchronous local update
export function saveMember(data: {
  block: string;
  flatNo: string;
  name: string;
  phone?: string;
  residentType?: string;
  ownerName?: string;
  ownerPhone?: string;
  additionalDetails?: string;
  familyMembers?: FamilyMember[];
  vehicles?: Vehicle[];
}): Member {
  const current = [...getMembers()];
  const block = String(data.block || "").toUpperCase().trim();
  const flatNo = String(data.flatNo || "").trim();
  const id = `${block}-${flatNo}`;
  const floor = parseFloorFromFlat(flatNo);
  const name = String(data.name || "").trim().slice(0, 100);
  const phone = cleanPhoneNumber(String(data.phone || ""));
  const residentType = (data.residentType === "Tenant" ? "Tenant" : "Owner") as "Owner" | "Tenant";
  const ownerName = residentType === "Tenant" ? String(data.ownerName || "").trim().slice(0, 100) : "";
  const ownerPhone = residentType === "Tenant" ? cleanPhoneNumber(String(data.ownerPhone || "")) : "";

  const sanitizedFamily = Array.isArray(data.familyMembers)
    ? data.familyMembers
        .map((f) => ({
          name: String(f.name || "").trim().slice(0, 100),
          phone: cleanPhoneNumber(String(f.phone || "")),
          relation: String(f.relation || "").trim().slice(0, 50),
        }))
        .filter((f) => Boolean(f.name || f.phone))
    : [];

  const sanitizedVehicles = Array.isArray(data.vehicles)
    ? data.vehicles
        .slice(0, societyConfig.limits.maxVehiclesPerFlat)
        .map((v) => ({
          regNo: String(v.regNo || "").toUpperCase().trim().slice(0, 20),
          type: v.type || "Car",
        }))
        .filter((v) => Boolean(v.regNo))
    : [];

  const isOccupied = Boolean(name || phone || sanitizedFamily.length > 0 || sanitizedVehicles.length > 0);

  const existingIndex = current.findIndex((m) => m.id === id);

  const record: Member = {
    id,
    block,
    flatNo,
    floor,
    name,
    phone,
    status: isOccupied ? "Occupied" : "Vacant",
    residentType,
    ownerName,
    ownerPhone,
    additionalDetails: String(data.additionalDetails || "").trim().slice(0, 500),
    familyMembers: sanitizedFamily,
    vehicles: sanitizedVehicles,
    updatedAt: new Date().toISOString(),
  };

  if (existingIndex !== -1) {
    current[existingIndex] = {
      ...current[existingIndex],
      ...record,
    };
  } else {
    current.push(record);
  }

  broadcastUpdate(current);
  return record;
}

export function exportDirectoryCSV(members: Member[]): void {
  const headers = [
    "Block",
    "Flat No",
    "Floor",
    "Resident Name",
    "Mobile Number",
    "Resident Type",
    "Owner Name",
    "Owner Phone",
    "Vehicles",
    "Status",
    "Additional Details",
  ];
  const rows = members.map((m) => {
    const vehiclesStr = (m.vehicles || [])
      .map((v) => `${v.regNo}${v.type ? ` (${v.type})` : ""}`)
      .join("; ");

    return [
      `"${m.block}"`,
      `"${m.flatNo}"`,
      `"${m.floor}"`,
      `"${(m.name || "").replace(/"/g, '""')}"`,
      `"${m.phone || ""}"`,
      `"${m.residentType || "Owner"}"`,
      `"${(m.ownerName || "").replace(/"/g, '""')}"`,
      `"${m.ownerPhone || ""}"`,
      `"${vehiclesStr.replace(/"/g, '""')}"`,
      `"${m.status}"`,
      `"${(m.additionalDetails || "").replace(/"/g, '""')}"`,
    ];
  });

  const csvContent =
    "data:text/csv;charset=utf-8,\uFEFF" +
    [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute(
    "download",
    `${societyConfig.storage.backupPrefix}_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
