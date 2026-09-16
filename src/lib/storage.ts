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

// Local storage reader (instant synchronous access)
export function getMembers(): Member[] {
  if (typeof window === "undefined") {
    return defaultMembers;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    return defaultMembers;
  } catch (e) {
    return defaultMembers;
  }
}

// Fetch live data from shared cloud database (Vercel Blob)
export async function fetchLiveMembers(): Promise<Member[]> {
  try {
    const res = await fetch(`/api/members?t=${Date.now()}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data: Member[] = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        }
        return data;
      }
    }
  } catch (error) {
    console.warn("Could not fetch live cloud members, using local storage:", error);
  }
  return getMembers();
}

// Save member to shared cloud database
export async function saveMemberCloud(data: {
  block: string;
  flatNo: string;
  name: string;
  phone?: string;
  additionalDetails?: string;
}): Promise<Member> {
  // Update local storage first for instant feedback
  const localRecord = saveMember(data);

  try {
    const res = await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.member) {
        return json.member;
      }
    }
  } catch (error) {
    console.error("Failed to sync member to cloud:", error);
  }

  return localRecord;
}

export function findMember(block: string, flatNo: string, list: Member[] = getMembers()): Member | undefined {
  const id = `${block.toUpperCase()}-${flatNo.trim()}`;
  return list.find(
    (m) =>
      m.id.toUpperCase() === id ||
      (m.block.toUpperCase() === block.toUpperCase() && String(m.flatNo) === String(flatNo))
  );
}

export function saveMember(data: {
  block: string;
  flatNo: string;
  name: string;
  phone?: string;
  additionalDetails?: string;
}): Member {
  const members = getMembers();
  const block = data.block.toUpperCase().trim();
  const flatNo = String(data.flatNo).trim();
  const id = `${block}-${flatNo}`;
  const floor = parseInt(flatNo.length > 2 ? cleanSlice(flatNo) : flatNo[0], 10) || 1;
  const name = (data.name || "").trim();
  const phone = (data.phone || "").trim().replace(/\D/g, "").slice(-10);
  const isOccupied = Boolean(name || phone);

  const existingIndex = members.findIndex((m) => m.id === id);

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
    members[existingIndex] = {
      ...members[existingIndex],
      ...record,
    };
  } else {
    members.push(record);
  }

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
    } catch (e) {
      console.error("Failed to save to localStorage:", e);
    }
  }

  return record;
}

function cleanSlice(val: string): string {
  return val.length > 2 ? val.slice(0, -2) : val[0];
}

export function exportDirectoryCSV(members: Member[]): void {
  const headers = ["Block", "Flat No", "Floor", "Resident Name", "Mobile Number", "Status", "Additional Details"];
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
    "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Ganesh_Heritage_Members_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
