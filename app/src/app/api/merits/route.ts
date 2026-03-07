import { NextRequest, NextResponse } from "next/server";
import { getAllMerits, awardMerits, getAllUsers, getAllOperations, logAudit } from "@/lib/db";
import { getSessionUser, requireAdmin } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(getAllMerits());
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin required" }, { status: 403 });

  const { usernames, operationId } = await req.json();
  if (!Array.isArray(usernames) || usernames.length === 0 || !operationId) {
    return NextResponse.json({ error: "usernames array and operationId required" }, { status: 400 });
  }

  const op = getAllOperations().find((o) => o.id === operationId);
  if (!op) return NextResponse.json({ error: "Operation not found" }, { status: 404 });
  if (!op.meritTag) return NextResponse.json({ error: "This operation has no merit tag configured" }, { status: 400 });

  const allUsers = getAllUsers().map((u) => u.username.toLowerCase());
  const valid = usernames.filter((u: string) => allUsers.includes(u.toLowerCase()));

  awardMerits(valid, op.meritTag, op.id, op.title, admin.username);
  logAudit("merit_award", admin.username, "operation", operationId, JSON.stringify({ usernames: valid, tag: op.meritTag }));
  return NextResponse.json({ ok: true, awarded: valid.length });
}
