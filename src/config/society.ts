/**
 * Centralized Society Configuration
 *
 * Configurable via environment variables (e.g. .env / .env.local) or by editing this file.
 * Allows reusing this application for any housing society / residential community.
 */

export interface SocietyBlock {
  id: string; // e.g. "A", "B", "C"
  name: string; // e.g. "Block A" or "Tower 1"
  floors: number; // Number of floors (e.g. 10 or 14)
  flatsPerFloor: number; // Flats per floor (e.g. 6 or 4)
  badgeClass: string; // Tailwind color styling for pill badge
}

export interface SocietyConfig {
  name: string;
  shortName: string;
  tagline: string;
  societyType: string;
  description: string;
  defaultBlock: string;
  blocks: SocietyBlock[];
  limits: {
    maxVehiclesPerFlat: number;
    maxFamilyMembersPerFlat: number;
  };
  allowEdit: boolean;
  theme: {
    themeColor: string;
    backgroundColor: string;
  };
  storage: {
    slug: string;
    localStorageKey: string;
    updateEvent: string;
    backupPrefix: string;
  };
}

// Color palette cycle for dynamic blocks
const DEFAULT_BADGE_CLASSES = [
  "bg-rose-50 text-rose-700 border-rose-100",
  "bg-sky-50 text-sky-700 border-sky-100",
  "bg-amber-50 text-amber-700 border-amber-100",
  "bg-purple-50 text-purple-700 border-purple-100",
  "bg-emerald-50 text-emerald-700 border-emerald-100",
  "bg-indigo-50 text-indigo-700 border-indigo-100",
  "bg-teal-50 text-teal-700 border-teal-100",
];

// Default floors and flats per floor when not overridden (defaults match Ganesh Heritage)
const defaultFloors = Math.max(1, parseInt(process.env.NEXT_PUBLIC_DEFAULT_FLOORS || "14", 10) || 14);
const defaultFlatsPerFloor = Math.max(1, parseInt(process.env.NEXT_PUBLIC_DEFAULT_FLATS_PER_FLOOR || "4", 10) || 4);

/**
 * Parse blocks from:
 * 1. NEXT_PUBLIC_BLOCK_STRUCTURE (format: "A:10:6,B:12:4,C:10:6,D:12:4")
 * 2. Or NEXT_PUBLIC_BLOCKS (comma-separated, e.g. "A,B,C,D") with default floors and flatsPerFloor
 */
function parseBlocks(): SocietyBlock[] {
  const structureRaw = process.env.NEXT_PUBLIC_BLOCK_STRUCTURE;
  if (structureRaw && structureRaw.trim()) {
    const parts = structureRaw.split(",").map((p) => p.trim()).filter(Boolean);
    return parts.map((part, index) => {
      // e.g. "A:10:6" or "Block A:10:6" or "A"
      const segments = part.split(":").map((s) => s.trim());
      const rawId = segments[0] || `B${index + 1}`;
      const id = rawId.toUpperCase();
      const floors = segments[1] ? Math.max(1, parseInt(segments[1], 10) || defaultFloors) : defaultFloors;
      const flatsPerFloor = segments[2] ? Math.max(1, parseInt(segments[2], 10) || defaultFlatsPerFloor) : defaultFlatsPerFloor;
      return {
        id,
        name: rawId.length <= 2 ? `Block ${id}` : rawId,
        floors,
        flatsPerFloor,
        badgeClass: DEFAULT_BADGE_CLASSES[index % DEFAULT_BADGE_CLASSES.length],
      };
    });
  }

  const raw = process.env.NEXT_PUBLIC_BLOCKS;
  const blockList = raw ? raw.split(",").map((b) => b.trim()).filter(Boolean) : ["A", "B", "C", "D"];

  return blockList.map((id, index) => ({
    id: id.toUpperCase(),
    name: id.length <= 2 ? `Block ${id.toUpperCase()}` : id,
    floors: defaultFloors,
    flatsPerFloor: defaultFlatsPerFloor,
    badgeClass: DEFAULT_BADGE_CLASSES[index % DEFAULT_BADGE_CLASSES.length],
  }));
}

const parsedBlocks = parseBlocks();
const societyName = process.env.NEXT_PUBLIC_SOCIETY_NAME || "Ganesh Heritage";
const societyShort = process.env.NEXT_PUBLIC_SOCIETY_SHORT_NAME || "Ganesh Heritage";
const rawSlug = (
  process.env.NEXT_PUBLIC_SOCIETY_ID ||
  process.env.NEXT_PUBLIC_SOCIETY_SLUG ||
  societyShort ||
  societyName ||
  "ganesh_heritage"
)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "_");
const slug = rawSlug === "gh" || rawSlug === "ganesh_heritage" ? "ganesh_heritage" : rawSlug;

export const societyConfig: SocietyConfig = {
  name: societyName,
  shortName: societyShort,
  tagline: process.env.NEXT_PUBLIC_SOCIETY_TAGLINE || "Resident Directory",
  societyType: process.env.NEXT_PUBLIC_SOCIETY_TYPE || "Co-operative Housing Society",
  description:
    process.env.NEXT_PUBLIC_SOCIETY_DESCRIPTION ||
    `Searchable resident directory for ${societyName} ${process.env.NEXT_PUBLIC_SOCIETY_TYPE || "Co-operative Housing Society"}`,
  defaultBlock: (process.env.NEXT_PUBLIC_DEFAULT_BLOCK || (parsedBlocks[0] ? parsedBlocks[0].id : "A")).toUpperCase(),
  blocks: parsedBlocks,
  limits: {
    maxVehiclesPerFlat: Math.max(1, parseInt(process.env.NEXT_PUBLIC_MAX_VEHICLES || "4", 10) || 4),
    maxFamilyMembersPerFlat: Math.max(1, parseInt(process.env.NEXT_PUBLIC_MAX_FAMILY_MEMBERS || "10", 10) || 10),
  },
  // When false: occupied flats cannot be edited, Edit buttons are hidden, and existing data cannot be overwritten
  allowEdit: process.env.NEXT_PUBLIC_ALLOW_EDIT !== "false",
  theme: {
    themeColor: process.env.NEXT_PUBLIC_THEME_COLOR || "#dc2626",
    backgroundColor: "#f8fafc",
  },
  storage: {
    slug,
    localStorageKey: `${slug}_members_v2`,
    updateEvent: `${slug}_members_updated`,
    backupPrefix: `${slug}_backup`,
  },
};

// Set of uppercase valid block IDs
export const VALID_BLOCK_IDS = new Set(societyConfig.blocks.map((b) => b.id));

export function isValidBlock(blockId: string): boolean {
  return VALID_BLOCK_IDS.has(String(blockId || "").toUpperCase().trim());
}

export function getBlockBadge(blockId: string): string {
  const cleanId = String(blockId || "").toUpperCase().trim();
  const match = societyConfig.blocks.find((b) => b.id === cleanId);
  return match ? match.badgeClass : "bg-gray-50 text-gray-700 border-gray-100";
}

export function getBlockName(blockId: string): string {
  const cleanId = String(blockId || "").toUpperCase().trim();
  const match = societyConfig.blocks.find((b) => b.id === cleanId);
  return match ? match.name : `Block ${cleanId}`;
}

export function formatFlatNumber(floor: number, flatIndex: number): string {
  return `${floor}${String(flatIndex).padStart(2, "0")}`;
}

export function parseFloorFromFlat(flatNo: string): number {
  const clean = String(flatNo || "").trim();
  if (clean.length > 2) {
    return parseInt(clean.slice(0, -2), 10) || 1;
  }
  return parseInt(clean[0] || "1", 10) || 1;
}

export interface GeneratedFlat {
  id: string; // e.g. "A-101"
  block: string; // "A"
  flatNo: string; // "101"
  floor: number; // 1
}

export function generateFlatsForBlock(blockId: string): GeneratedFlat[] {
  const cleanId = String(blockId || "").toUpperCase().trim();
  const block = societyConfig.blocks.find((b) => b.id === cleanId);
  if (!block) return [];

  const flats: GeneratedFlat[] = [];
  for (let floor = 1; floor <= block.floors; floor++) {
    for (let fIndex = 1; fIndex <= block.flatsPerFloor; fIndex++) {
      const flatNo = formatFlatNumber(floor, fIndex);
      flats.push({
        id: `${block.id}-${flatNo}`,
        block: block.id,
        flatNo,
        floor,
      });
    }
  }
  return flats;
}

export function generateAllSocietyFlats(): GeneratedFlat[] {
  return societyConfig.blocks.flatMap((b) => generateFlatsForBlock(b.id));
}

export function isValidFlatForBlock(blockId: string, flatNo: string): boolean {
  const cleanId = String(blockId || "").toUpperCase().trim();
  const cleanFlat = String(flatNo || "").trim();
  const block = societyConfig.blocks.find((b) => b.id === cleanId);
  if (!block) return false;
  const floor = parseFloorFromFlat(cleanFlat);
  if (floor < 1 || floor > block.floors) return false;
  const flatIndex = parseInt(cleanFlat.slice(-2), 10);
  if (isNaN(flatIndex) || flatIndex < 1 || flatIndex > block.flatsPerFloor) return false;
  return true;
}
