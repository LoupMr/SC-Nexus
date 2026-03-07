import { NextRequest, NextResponse } from "next/server";
import { getAuditLog } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { api403 } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return api403("Admin required");

  const { searchParams } = new URL(req.url);
  const limit = Math.min(500, Math.max(1, parseInt(searchParams.get("limit") || "100", 10)));

  const entries = getAuditLog(limit);
  return NextResponse.json(entries);
}
