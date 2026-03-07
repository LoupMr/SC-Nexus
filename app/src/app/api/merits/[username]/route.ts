import { NextRequest, NextResponse } from "next/server";
import { getMemberMerits, revokeMerit } from "@/lib/db";
import { getSessionUser, requireAdmin } from "@/lib/session";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { username } = await params;
  if (!user.roles?.includes("admin") && user.username.toLowerCase() !== username.toLowerCase()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(getMemberMerits(username));
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin required" }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Merit id required" }, { status: 400 });

  const deleted = revokeMerit(Number(id));
  if (!deleted) return NextResponse.json({ error: "Merit not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
