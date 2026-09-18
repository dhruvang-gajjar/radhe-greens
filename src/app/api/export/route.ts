import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "json";

    const members = await prisma.member.findMany({
      orderBy: [{ block: "asc" }, { floor: "asc" }, { flatNo: "asc" }],
    });

    if (format === "csv") {
      const headers = ["id", "block", "flatNo", "floor", "name", "phone", "status", "residentType", "additionalDetails", "updatedAt"];
      const rows = members.map((m) =>
        [
          m.id,
          m.block,
          m.flatNo,
          m.floor,
          `"${(m.name || "").replace(/"/g, '""')}"`,
          `"${m.phone || ""}"`,
          m.status,
          `"${(m.residentType || "").replace(/"/g, '""')}"`,
          `"${(m.additionalDetails || "").replace(/"/g, '""')}"`,
          m.updatedAt.toISOString(),
        ].join(",")
      );

      const csvContent = [headers.join(","), ...rows].join("\n");

      return new Response(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="ganesh_heritage_backup_${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return new Response(JSON.stringify(members, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="ganesh_heritage_backup_${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}
