import { NextRequest, NextResponse } from "next/server";
import { getAllHangarAssets, addHangarAsset, getAllHangarCategories, getUserHangarSelections, getSelectionsForAsset } from "@/lib/db";
import { getSessionUser, requireAdmin } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const assets = getAllHangarAssets();
  const categories = getAllHangarCategories();
  const selections = getUserHangarSelections(user.username);
  const selectionsByAsset: Record<string, string[]> = {};
  for (const a of assets) {
    selectionsByAsset[a.id] = getSelectionsForAsset(a.id);
  }
  return NextResponse.json({ assets, categories, selections, selectionsByAsset });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin required" }, { status: 403 });

  const { name, description, shipClass, requirementTag, categoryId, requirementCount } = await req.json();
  if (!name || !requirementTag) {
    return NextResponse.json({ error: "Name and requirementTag required" }, { status: 400 });
  }

  const asset = addHangarAsset(name, description || "", shipClass || "", requirementTag, categoryId || "cat-executive", requirementCount ?? 2);
  return NextResponse.json(asset, { status: 201 });
}
