import { NextRequest, NextResponse } from "next/server";
import { getGuideById, approveGuide, rejectGuide } from "@/lib/db";
import { requireGuideAccess } from "@/lib/session";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireGuideAccess();
  if (!user) return NextResponse.json({ error: "Admin or Guide role required" }, { status: 403 });

  const { id } = await params;
  const guide = getGuideById(id);
  if (!guide) return NextResponse.json({ error: "Guide not found" }, { status: 404 });

  const updated = approveGuide(id, user.username);
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireGuideAccess();
  if (!user) return NextResponse.json({ error: "Admin or Guide role required" }, { status: 403 });

  const { id } = await params;
  const guide = getGuideById(id);
  if (!guide) return NextResponse.json({ error: "Guide not found" }, { status: 404 });

  const updated = rejectGuide(id);
  return NextResponse.json(updated);
}
