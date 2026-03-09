import { NextRequest } from "next/server";
import { updateLink, deleteLink } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { linkUpdateSchema } from "@/lib/validations";
import { api400, api403, api404, safeParseJson } from "@/lib/api-utils";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return api403("Admin required");

  const json = await safeParseJson(req);
  if ("error" in json) return json.error;
  const parsed = linkUpdateSchema.safeParse(json.data);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "Invalid input";
    return api400(msg);
  }
  const { id } = await params;
  const { title, description, url } = parsed.data;

  const link = updateLink(id, title, description, url);
  if (!link) return api404("Link not found");
  return Response.json(link);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return api403("Admin required");

  const { id } = await params;
  const deleted = deleteLink(id);
  if (!deleted) return api404("Link not found");
  return Response.json({ ok: true });
}
