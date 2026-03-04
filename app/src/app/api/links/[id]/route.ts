import { NextRequest, NextResponse } from "next/server";
import { updateLink, deleteLink } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin required" }, { status: 403 });

  const { id } = await params;
  const { title, description, url } = await req.json();
  if (!title || !url) {
    return NextResponse.json({ error: "Title and URL required" }, { status: 400 });
  }

  const link = updateLink(id, title, description || "", url);
  if (!link) return NextResponse.json({ error: "Link not found" }, { status: 404 });
  return NextResponse.json(link);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin required" }, { status: 403 });

  const { id } = await params;
  const deleted = deleteLink(id);
  if (!deleted) return NextResponse.json({ error: "Link not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
