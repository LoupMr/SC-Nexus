import { NextRequest } from "next/server";
import { getApprovedGuides, getAllGuides, createGuide } from "@/lib/db";
import { getSessionUser, requireGuideAccess } from "@/lib/session";
import { guideCreateSchema } from "@/lib/validations";
import { api400, api401, safeParseJson } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  const { searchParams } = new URL(req.url);
  const admin = searchParams.get("admin") === "1";

  if (admin && user) {
    const approver = await requireGuideAccess();
    if (approver) {
      const guides = getAllGuides();
      return Response.json(guides);
    }
  }

  const guides = getApprovedGuides();
  return Response.json(guides);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return api401();

  const json = await safeParseJson(req);
  if ("error" in json) return json.error;
  const parsed = guideCreateSchema.safeParse(json.data);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "Invalid input";
    return api400(msg);
  }
  const { title, content, excerpt } = parsed.data;

  const guide = createGuide(title, content, excerpt, user.username);
  return Response.json(guide, { status: 201 });
}
