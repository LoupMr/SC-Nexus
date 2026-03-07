import { NextRequest, NextResponse } from "next/server";
import { getAllHangarCategories, addHangarCategory } from "@/lib/db";
import { getSessionUser, requireAdmin } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(getAllHangarCategories());
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin required" }, { status: 403 });

  const { name, description } = await req.json();
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const category = addHangarCategory(name, description || "");
  return NextResponse.json(category, { status: 201 });
}
