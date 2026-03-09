import { NextRequest } from "next/server";
import { updateHangarCategory, deleteHangarCategory } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { hangarCategorySchema } from "@/lib/validations";
import { api400, api403, api404, safeParseJson } from "@/lib/api-utils";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return api403("Admin required");

  const json = await safeParseJson(req);
  if ("error" in json) return json.error;
  const parsed = hangarCategorySchema.safeParse(json.data);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "Invalid input";
    return api400(msg);
  }
  const { id } = await params;
  const { name, description } = parsed.data;

  const updated = updateHangarCategory(id, name, description);
  if (!updated) return api404("Category not found");
  return Response.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return api403("Admin required");

  const { id } = await params;
  const deleted = deleteHangarCategory(id);
  if (!deleted) return api404("Category not found");
  return Response.json({ ok: true });
}
