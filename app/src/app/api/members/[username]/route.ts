import { NextRequest, NextResponse } from "next/server";
import { updateUserRole, updateUserRoles, updateUserRank, deleteUser, logAudit } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

const VALID_RANKS = ["none", "supreme_commander", "executive_commander", "captain", "non_commissioned_officer", "operator", "black_horizon_group_ally"];
const VALID_ROLES = ["viewer", "admin", "logistics", "ops", "raffle"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin required" }, { status: 403 });

  const { username } = await params;
  const body = await req.json();
  const { role, roles, rank } = body;

  if (Array.isArray(roles) && roles.length > 0) {
    const valid = roles.filter((r: string) => VALID_ROLES.includes(r));
    if (valid.length > 0) updateUserRoles(username, valid);
  } else if (role && VALID_ROLES.includes(role)) {
    updateUserRole(username, role);
  }
  if (rank && VALID_RANKS.includes(rank)) {
    updateUserRank(username, rank);
  }
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
  logAudit("user_delete", admin.username, "user", username, undefined);
  return NextResponse.json({ ok: true });
}
