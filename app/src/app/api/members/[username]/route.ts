import { NextRequest, NextResponse } from "next/server";
import { updateUserRole, deleteUser } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin required" }, { status: 403 });

  const { username } = await params;
  const { role } = await req.json();
  if (!role || !["viewer", "admin", "logistics", "ops"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  updateUserRole(username, role);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin required" }, { status: 403 });

  const { username } = await params;
  if (admin.username.toLowerCase() === username.toLowerCase()) {
    return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
  }

  deleteUser(username);
  return NextResponse.json({ ok: true });
}
