import { NextRequest } from "next/server";
import { deleteHangarAsset, updateHangarAsset } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { hangarAssetUpdateSchema } from "@/lib/validations";
import { api400, api403, api404, safeParseJson } from "@/lib/api-utils";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return api403("Admin required");

  const json = await safeParseJson(req);
  if ("error" in json) return json.error;
  const parsed = hangarAssetUpdateSchema.safeParse(json.data);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "Invalid input";
    return api400(msg);
  }
  const { id } = await params;
  const { name, description, shipClass, requirementTag, categoryId, requirementCount } = parsed.data;

  const updated = updateHangarAsset(id, name, description, shipClass, requirementTag, categoryId, requirementCount);
  if (!updated) return api404("Asset not found");
  return Response.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return api403("Admin required");

  const { id } = await params;
  const deleted = deleteHangarAsset(id);
  if (!deleted) return api404("Asset not found");
  return Response.json({ ok: true });
}
