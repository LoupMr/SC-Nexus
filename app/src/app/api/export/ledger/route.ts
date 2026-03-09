import { NextRequest, NextResponse } from "next/server";
import { getLedgerEntriesForView } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { api401 } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return api401();

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "json";
  const view = (searchParams.get("view") || "org") as "org" | "mine";

  const entries = getLedgerEntriesForView(view, user.username);

  if (format === "csv") {
    const escapeCsv = (val: string | number | boolean): string => {
      const s = String(val);
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    const headers = ["id", "itemName", "subcategory", "owner", "status", "quantity", "location", "sharedWithOrg"];
    const rows = entries.map((e) =>
      [e.id, e.itemName, e.subcategory, e.owner, e.status, e.quantity, e.location, e.sharedWithOrg].map(escapeCsv).join(",")
    );
    const csv = [headers.map(escapeCsv).join(","), ...rows].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="ledger-${view}-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json(entries, {
    headers: {
      "Content-Disposition": `attachment; filename="ledger-${view}-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
