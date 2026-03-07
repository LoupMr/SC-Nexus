import { NextRequest, NextResponse } from "next/server";
import { getUserHangarSelections, createHangarSelection } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(getUserHangarSelections(user.username));
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { assetId } = await req.json();
  if (!assetId) return NextResponse.json({ error: "assetId required" }, { status: 400 });

  const result = createHangarSelection(user.username, assetId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result.selection, { status: 201 });
}
