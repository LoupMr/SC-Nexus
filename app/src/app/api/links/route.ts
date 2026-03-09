import { NextRequest } from "next/server";
import { getAllLinks, createLink } from "@/lib/db";
import { getSessionUser, requireAdmin } from "@/lib/session";
import { linkCreateSchema } from "@/lib/validations";
import { api400, api401, api403, safeParseJson } from "@/lib/api-utils";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return api401();
  return Response.json(getAllLinks());
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return api403("Admin required");

  const json = await safeParseJson(req);
  if ("error" in json) return json.error;
  const parsed = linkCreateSchema.safeParse(json.data);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "Invalid input";
    return api400(msg);
  }
  const { title, description, url } = parsed.data;

  const link = createLink(title, description, url);
  return Response.json(link, { status: 201 });
}
