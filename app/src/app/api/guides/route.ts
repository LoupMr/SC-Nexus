import { NextRequest, NextResponse } from "next/server";
import { getApprovedGuides, getAllGuides, createGuide } from "@/lib/db";
import { getSessionUser, requireGuideAccess } from "@/lib/session";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  const { searchParams } = new URL(req.url);
  const admin = searchParams.get("admin") === "1";

  if (admin && user) {
    const approver = await requireGuideAccess();
    if (approver) {
      const guides = getAllGuides();
      return NextResponse.json(guides);
    }
  }

  const guides = getApprovedGuides();
  return NextResponse.json(guides);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, content, excerpt } = body as { title?: string; content?: string; excerpt?: string };

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }
  if (!content || typeof content !== "string") {
    return NextResponse.json({ error: "Content required" }, { status: 400 });
  }

  const guide = createGuide(title.trim(), content, excerpt?.trim() || null, user.username);
  return NextResponse.json(guide, { status: 201 });
}
