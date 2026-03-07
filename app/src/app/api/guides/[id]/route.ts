import { NextRequest, NextResponse } from "next/server";
import { getGuideById, updateGuide, deleteGuide } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guide = getGuideById(id);
  if (!guide) return NextResponse.json({ error: "Guide not found" }, { status: 404 });

  if (guide.status !== "approved") {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Guide not found" }, { status: 404 });
    const isAuthor = guide.authorUsername.toLowerCase() === user.username.toLowerCase();
    const canApprove = user.roles?.includes("admin") || user.roles?.includes("guide");
    if (!isAuthor && !canApprove) return NextResponse.json({ error: "Guide not found" }, { status: 404 });
  }

  return NextResponse.json(guide);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const guide = getGuideById(id);
  if (!guide) return NextResponse.json({ error: "Guide not found" }, { status: 404 });

  const isAuthor = guide.authorUsername.toLowerCase() === user.username.toLowerCase();
  if (!isAuthor) return NextResponse.json({ error: "You can only edit your own guides" }, { status: 403 });

  const body = await req.json();
  const { title, content, excerpt } = body as { title?: string; content?: string; excerpt?: string };

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }
  if (!content || typeof content !== "string") {
    return NextResponse.json({ error: "Content required" }, { status: 400 });
  }

  const updated = updateGuide(id, title.trim(), content, excerpt?.trim() || null);
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const guide = getGuideById(id);
  if (!guide) return NextResponse.json({ error: "Guide not found" }, { status: 404 });

  const isAuthor = guide.authorUsername.toLowerCase() === user.username.toLowerCase();
  const canApprove = user.roles?.includes("admin") || user.roles?.includes("guide");
  if (!isAuthor && !canApprove) return NextResponse.json({ error: "You cannot delete this guide" }, { status: 403 });

  deleteGuide(id);
  return NextResponse.json({ ok: true });
}
