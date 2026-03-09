import { NextRequest } from "next/server";
import { updateUserRoles, updateUserRank, deleteUser, logAudit, findUserByUsername } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { memberPatchSchema } from "@/lib/validations";
import { api400, api403, safeParseJson } from "@/lib/api-utils";

const VALID_RANKS = ["none", "supreme_commander", "executive_commander", "captain", "non_commissioned_officer", "operator", "black_horizon_group_ally"];
const VALID_ROLES = ["viewer", "admin", "logistics", "ops", "raffle", "guide"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return api403("Admin required");

  const json = await safeParseJson(req);
  if ("error" in json) return json.error;
  const parsed = memberPatchSchema.safeParse(json.data);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "Invalid input";
    return api400(msg);
  }
  const { role, roles, rank } = parsed.data;

  const { username } = await params;
  const isPermanentAdminAccount = (u: string) => u.toLowerCase() === "admin";

  if (Array.isArray(roles) && roles.length > 0) {
    const target = findUserByUsername(username);
    const currentRoles = target ? (target.role || "viewer").split(",").map((s) => s.trim()).filter(Boolean) : [];
    const requested = roles.filter((r: string) => VALID_ROLES.includes(r));
    let finalRoles = requested;
    if (isPermanentAdminAccount(username)) {
      finalRoles = finalRoles.includes("admin") ? finalRoles : [...finalRoles, "admin"];
    }
    if (finalRoles.length > 0) updateUserRoles(username, finalRoles);
  } else if (role && VALID_ROLES.includes(role)) {
    const target = findUserByUsername(username);
    const currentRoles = target ? (target.role || "viewer").split(",").map((s) => s.trim()).filter(Boolean) : [];
    let finalRoles = [role];
    if (isPermanentAdminAccount(username)) {
      finalRoles = [...finalRoles, "admin"];
    }
    updateUserRoles(username, finalRoles);
  }
  if (rank && VALID_RANKS.includes(rank)) {
    updateUserRank(username, rank);
  }
  return Response.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return api403("Admin required");

  const { username } = await params;
  if (admin.username.toLowerCase() === username.toLowerCase()) {
    return api400("Cannot remove yourself");
  }

  deleteUser(username);
  logAudit("user_delete", admin.username, "user", username, undefined);
  return Response.json({ ok: true });
}
