import { NextRequest } from "next/server";
import { getGuideById, updateGuide, deleteGuide } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { guideUpdateSchema } from "@/lib/validations";
import { api400, api401, api403, api404, safeParseJson } from "@/lib/api-utils";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guide = getGuideById(id);
  if (!guide) return api404("Guide not found");

  if (guide.status !== "approved") {
    const user = await getSessionUser();
    if (!user) return api404("Guide not found");
    const isAuthor = guide.authorUsername.toLowerCase() === user.username.toLowerCase();
    const canApprove = user.roles?.includes("admin") || user.roles?.includes("guide");
    if (!isAuthor && !canApprove) return api404("Guide not found");
  }

  return Response.json(guide);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return api401();

  const { id } = await params;
  const guide = getGuideById(id);
  if (!guide) return api404("Guide not found");

  const isAuthor = guide.authorUsername.toLowerCase() === user.username.toLowerCase();
  if (!isAuthor) return api403("You can only edit your own guides");

  const json = await safeParseJson(req);
  if ("error" in json) return json.error;
  const parsed = guideUpdateSchema.safeParse(json.data);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "Invalid input";
    return api400(msg);
  }
  const { title, content, excerpt } = parsed.data;

  const updated = updateGuide(id, title, content, excerpt);
  return Response.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return api401();

  const { id } = await params;
  const guide = getGuideById(id);
  if (!guide) return api404("Guide not found");

  const isAuthor = guide.authorUsername.toLowerCase() === user.username.toLowerCase();
  const canApprove = user.roles?.includes("admin") || user.roles?.includes("guide");
  if (!isAuthor && !canApprove) return api403("You cannot delete this guide");

  deleteGuide(id);
  return Response.json({ ok: true });
}
