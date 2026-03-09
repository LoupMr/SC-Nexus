import { NextRequest } from "next/server";
import { getAllMerits, awardMerits, getAllUsers, getAllOperations, logAudit } from "@/lib/db";
import { getSessionUser, requireAdmin } from "@/lib/session";
import { meritAwardSchema } from "@/lib/validations";
import { api400, api401, api403, api404, safeParseJson } from "@/lib/api-utils";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return api401();
  return Response.json(getAllMerits());
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return api403("Admin required");

  const json = await safeParseJson(req);
  if ("error" in json) return json.error;
  const parsed = meritAwardSchema.safeParse(json.data);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "Invalid input";
    return api400(msg);
  }
  const { usernames, operationId } = parsed.data;

  const op = getAllOperations().find((o) => o.id === operationId);
  if (!op) return api404("Operation not found");
  if (!op.meritTag) return api400("This operation has no merit tag configured");

  const allUsers = getAllUsers().map((u) => u.username.toLowerCase());
  const valid = usernames.filter((u) => allUsers.includes(u.toLowerCase()));

  awardMerits(valid, op.meritTag, op.id, op.title, admin.username);
  logAudit("merit_award", admin.username, "operation", operationId, JSON.stringify({ usernames: valid, tag: op.meritTag }));
  return Response.json({ ok: true, awarded: valid.length });
}
