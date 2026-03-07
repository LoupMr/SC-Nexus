import { NextRequest, NextResponse } from "next/server";
import { getAllMerits, getMemberMerits } from "@/lib/db";
import { getSessionUser, requireAdmin } from "@/lib/session";
import { api401 } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return api401();

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "json";
  const username = searchParams.get("username");

  const isAdmin = await requireAdmin();
  let merits: { id: number; username: string; tag: string; operationId: string; operationName: string; awardedBy: string; awardedAt: string }[];

  if (username && isAdmin) {
    merits = getMemberMerits(username);
  } else if (isAdmin) {
    merits = getAllMerits();
  } else {
    merits = getMemberMerits(user.username);
  }

  if (format === "csv") {
    const headers = ["id", "username", "tag", "operationId", "operationName", "awardedBy", "awardedAt"];
    const rows = merits.map((m) =>
      [m.id, m.username, m.tag, m.operationId, m.operationName, m.awardedBy, m.awardedAt].join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="merits-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json(merits, {
    headers: {
      "Content-Disposition": `attachment; filename="merits-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
