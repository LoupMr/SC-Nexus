import { NextRequest } from "next/server";
import { getMemberMerits, revokeMerit } from "@/lib/db";
import { getSessionUser, requireAdmin } from "@/lib/session";
import { meritRevokeSchema } from "@/lib/validations";
import { api400, api401, api403, api404, safeParseJson } from "@/lib/api-utils";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const user = await getSessionUser();
  if (!user) return api401();

  const { username } = await params;
  if (!user.roles?.includes("admin") && user.username.toLowerCase() !== username.toLowerCase()) {
    return api403("Forbidden");
  }

  return Response.json(getMemberMerits(username));
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return api403("Admin required");

  const json = await safeParseJson(req);
  if ("error" in json) return json.error;
  const parsed = meritRevokeSchema.safeParse(json.data);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "Invalid input";
    return api400(msg);
  }
  const deleted = revokeMerit(parsed.data.id);
  if (!deleted) return api404("Merit not found");
  return Response.json({ ok: true });
}
