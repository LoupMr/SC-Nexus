import { NextRequest } from "next/server";
import { getAllHangarCategories, addHangarCategory } from "@/lib/db";
import { getSessionUser, requireAdmin } from "@/lib/session";
import { hangarCategorySchema } from "@/lib/validations";
import { api400, api401, api403, safeParseJson } from "@/lib/api-utils";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return api401();
  return Response.json(getAllHangarCategories());
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return api403("Admin required");

  const json = await safeParseJson(req);
  if ("error" in json) return json.error;
  const parsed = hangarCategorySchema.safeParse(json.data);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "Invalid input";
    return api400(msg);
  }
  const { name, description } = parsed.data;

  const category = addHangarCategory(name, description);
  return Response.json(category, { status: 201 });
}
