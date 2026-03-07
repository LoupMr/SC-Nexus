import { NextResponse } from "next/server";
import { getPasskey, regeneratePasskeyDb, logAudit } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin required" }, { status: 403 });
  return NextResponse.json({ passkey: getPasskey() });
}

export async function POST() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin required" }, { status: 403 });
  const key = regeneratePasskeyDb();
  logAudit("passkey_regenerate", admin.username, "config", "passkey", undefined);
  return NextResponse.json({ passkey: key });
}
