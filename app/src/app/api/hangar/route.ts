import { NextRequest } from "next/server";
import { getAllHangarAssets, addHangarAsset, getAllHangarCategories, getUserHangarSelections, getSelectionsForAsset } from "@/lib/db";
import { getSessionUser, requireAdmin } from "@/lib/session";
import { hangarAssetCreateSchema } from "@/lib/validations";
import { api400, api401, api403, safeParseJson } from "@/lib/api-utils";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return api401();
  const assets = getAllHangarAssets();
  const categories = getAllHangarCategories();
  const selections = getUserHangarSelections(user.username);
  const selectionsByAsset: Record<string, string[]> = {};
  for (const a of assets) {
    selectionsByAsset[a.id] = getSelectionsForAsset(a.id);
  }
  return Response.json({ assets, categories, selections, selectionsByAsset });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return api403("Admin required");

  const json = await safeParseJson(req);
  if ("error" in json) return json.error;
  const parsed = hangarAssetCreateSchema.safeParse(json.data);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "Invalid input";
    return api400(msg);
  }
  const { name, description, shipClass, requirementTag, categoryId, requirementCount } = parsed.data;

  const asset = addHangarAsset(name, description, shipClass, requirementTag, categoryId, requirementCount);
  return Response.json(asset, { status: 201 });
}
