import initialMembers from "@/data/members.json";

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

function broadcastUpdate(updatedList: Member[]) {
  memoryMembers = [...updatedList];
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryMembers));
      window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: memoryMembers }));
    } catch (e) {
      console.error("Storage error:", e);
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

// Get current members (memory -> localStorage -> default)
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
        memoryMembers = parsed;
        return memoryMembers;
      }
    }
  } catch (e) {
    console.warn("Error reading localStorage:", e);
  }

  memoryMembers = [...defaultMembers];
  return memoryMembers;
}

// Fetch live data from cloud once on load without continuous polling
export async function fetchLiveMembers(): Promise<Member[]> {
  try {
    const res = await fetch(`/api/members?_t=${Date.now()}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data: Member[] = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        broadcastUpdate(data);
        return data;
      }
    }
  } catch (error) {
    console.warn("Cloud fetch skipped, using local data:", error);
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
}): Promise<Member> {
  // 1. Immediately update local data so all pages see the new value instantly
  const localRecord = saveMember(data);

  // 2. Background sync to Vercel Blob cloud (does not block local UI)
  fetch("/api/members", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).catch((err) => {
    console.error("Background cloud sync error:", err);
  });

  return localRecord;
}

export function findMember(
  block: string,
  flatNo: string,
  list: Member[] = getMembers()
): Member | undefined {
  const id = `${block.toUpperCase()}-${flatNo.trim()}`;
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
}): Member {
  const current = [...getMembers()];
  const block = data.block.toUpperCase().trim();
  const flatNo = String(data.flatNo).trim();
  const id = `${block}-${flatNo}`;
  const floor = parseInt(flatNo.length > 2 ? cleanSlice(flatNo) : flatNo[0], 10) || 1;
  const name = (data.name || "").trim();
  const phone = (data.phone || "").trim().replace(/\D/g, "").slice(-10);
  const isOccupied = Boolean(name || phone);

  const existingIndex = current.findIndex((m) => m.id === id);

  const record: Member = {
    id,
    block,
    flatNo,
    floor,
    name,
    phone,
    status: isOccupied ? "Occupied" : "Vacant",
    additionalDetails: (data.additionalDetails || "").trim(),
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

  // Update in-memory, localStorage, and notify all subscribers
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
