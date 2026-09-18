import initialMembers from "@/data/members.json";

export interface FamilyMember {
  name: string;
  phone: string;
  relation?: string;
}

export interface Member {
  id: string;
  block: string;
  flatNo: string;
  floor: number;
  name: string;
  phone: string;
  status: "Occupied" | "Vacant";
  residentType?: string;
  additionalDetails?: string;
  familyMembers?: FamilyMember[];
  updatedAt?: string;
}

export const defaultMembers = initialMembers as Member[];

const STORAGE_KEY = "ganesh_heritage_members_v2";
const UPDATE_EVENT = "gh_members_updated";

// In-memory cache shared across the client application session
let memoryMembers: Member[] | null = null;
const listeners = new Set<(members: Member[]) => void>();

export function subscribeMembers(cb: (members: Member[]) => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

// Guarantee all 224 flats exist and are never lost
function mergeWithBaseline(records: Member[]): Member[] {
  const map = new Map<string, Member>();
  defaultMembers.forEach((m) => map.set(m.id, m));
  if (Array.isArray(records)) {
    records.forEach((m) => {
      if (m && m.id && map.has(m.id)) {
        map.set(m.id, { ...map.get(m.id)!, ...m });
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

// Normalize phone digits
export function cleanPhoneNumber(raw: string): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits.slice(-10);
}

// Fetch live data from cloud once on load without continuous polling
export async function fetchLiveMembers(): Promise<Member[]> {
  try {
    const res = await fetch(`/api/members?_t=${Date.now()}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const merged = mergeWithBaseline(data);
        broadcastUpdate(merged);
        return merged;
      }
    }
  } catch (error) {
    console.warn("Cloud fetch skipped, using resilient local data:", error);
  }
  return getMembers();
}

// Update local member immediately and sync to cloud in background
export async function saveMemberCloud(data: {
  block: string;
  flatNo: string;
  name: string;
  phone?: string;
  additionalDetails?: string;
  familyMembers?: FamilyMember[];
}): Promise<Member> {
  // 1. Immediately update local data so all pages see the new value instantly
  const localRecord = saveMember(data);

  // 2. Background sync to database API (does not block local UI)
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
  additionalDetails?: string;
  familyMembers?: FamilyMember[];
}): Member {
  const current = [...getMembers()];
  const block = String(data.block || "").toUpperCase().trim();
  const flatNo = String(data.flatNo || "").trim();
  const id = `${block}-${flatNo}`;
  const floor = parseInt(flatNo.length > 2 ? cleanSlice(flatNo) : flatNo[0], 10) || 1;
  const name = String(data.name || "").trim().slice(0, 100);
  const phone = cleanPhoneNumber(String(data.phone || ""));
  const sanitizedFamily = Array.isArray(data.familyMembers)
    ? data.familyMembers
        .map((f) => ({
          name: String(f.name || "").trim().slice(0, 100),
          phone: cleanPhoneNumber(String(f.phone || "")),
          relation: String(f.relation || "").trim().slice(0, 50),
        }))
        .filter((f) => Boolean(f.name || f.phone))
    : [];

  const isOccupied = Boolean(name || phone || sanitizedFamily.length > 0);

  const existingIndex = current.findIndex((m) => m.id === id);

  const record: Member = {
    id,
    block,
    flatNo,
    floor,
    name,
    phone,
    status: isOccupied ? "Occupied" : "Vacant",
    additionalDetails: String(data.additionalDetails || "").trim().slice(0, 500),
    familyMembers: sanitizedFamily,
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

function cleanSlice(val: string): string {
  return val.length > 2 ? val.slice(0, -2) : val[0];
}

export function exportDirectoryCSV(members: Member[]): void {
  const headers = [
    "Block",
    "Flat No",
    "Floor",
    "Resident Name",
    "Mobile Number",
    "Status",
    "Additional Details",
  ];
  const rows = members.map((m) => [
    `"${m.block}"`,
    `"${m.flatNo}"`,
    `"${m.floor}"`,
    `"${(m.name || "").replace(/"/g, '""')}"`,
    `"${m.phone || ""}"`,
    `"${m.status}"`,
    `"${(m.additionalDetails || "").replace(/"/g, '""')}"`,
  ]);

  const csvContent =
    "data:text/csv;charset=utf-8,\uFEFF" +
    [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute(
    "download",
    `Ganesh_Heritage_Members_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
