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

const STORAGE_KEY = "ganesh_heritage_members_v2";

export function getMembers(): Member[] {
  if (typeof window === "undefined") {
    return initialMembers as Member[];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    // Initialize if empty
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialMembers));
    return initialMembers as Member[];
  } catch (e) {
    console.error("Error accessing localStorage:", e);
    return initialMembers as Member[];
  }
}

export function findMember(block: string, flatNo: string): Member | undefined {
  const members = getMembers();
  const id = `${block.toUpperCase()}-${flatNo.trim()}`;
  return members.find(
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
  const floor = parseInt(flatNo.length > 2 ? flatNo.slice(0, -2) : flatNo[0], 10) || 1;
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

export function resetToInitial(): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialMembers));
  }
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
