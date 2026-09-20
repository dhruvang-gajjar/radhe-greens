import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { societyConfig } from "@/config/society";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "json";

    const members = await prisma.member.findMany({
      where: { societyId: societyConfig.storage.slug },
      orderBy: [{ block: "asc" }, { floor: "asc" }, { flatNo: "asc" }],
    });

    if (format === "csv") {
      const headers = ["id", "block", "flatNo", "floor", "name", "phone", "residentType", "ownerName", "ownerPhone", "familyMembers", "vehicles", "status", "additionalDetails", "updatedAt"];
      const rows = members.map((m) => {
        let familyStr = "";
        if (Array.isArray(m.familyMembers)) {
          familyStr = (m.familyMembers as any[])
            .map((f) => `${f.name}${f.relation ? ` (${f.relation})` : ""}: ${f.phone}`)
            .join("; ");
        }

        let vehiclesStr = "";
        if (Array.isArray(m.vehicles)) {
          vehiclesStr = (m.vehicles as any[])
            .map((v) => `${v.regNo}${v.type ? ` (${v.type})` : ""}`)
            .join("; ");
        }

        return [
          m.id,
          m.block,
          m.flatNo,
          m.floor,
          `"${(m.name || "").replace(/"/g, '""')}"`,
          `"${m.phone || ""}"`,
          `"${(m.residentType || "Owner").replace(/"/g, '""')}"`,
          `"${(m.ownerName || "").replace(/"/g, '""')}"`,
          `"${m.ownerPhone || ""}"`,
          `"${familyStr.replace(/"/g, '""')}"`,
          `"${vehiclesStr.replace(/"/g, '""')}"`,
          m.status,
          `"${(m.additionalDetails || "").replace(/"/g, '""')}"`,
          m.updatedAt.toISOString(),
        ].join(",");
      });

      const csvContent = [headers.join(","), ...rows].join("\n");

      return new Response(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${societyConfig.storage.backupPrefix}_${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return new Response(JSON.stringify(members, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${societyConfig.storage.backupPrefix}_${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}
