import { NextRequest, NextResponse } from "next/server";
import { updateOperation, deleteOperation, updateOperationMeritTag } from "@/lib/db";
import { requireOpsAccess, requireAdmin } from "@/lib/session";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireOpsAccess();
  if (!user) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { id } = await params;
  const { title, description, status, priority, meritTag, steps } = await req.json();
  if (!title || !description) {
    return NextResponse.json({ error: "Title and description required" }, { status: 400 });
  }

  const op = updateOperation(id, title, description, status || "active", priority || "medium", meritTag || "", steps || []);
  if (!op) return NextResponse.json({ error: "Operation not found" }, { status: 404 });
  return NextResponse.json(op);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin required" }, { status: 403 });

  const { id } = await params;
  const { meritTag } = await req.json();
  const updated = updateOperationMeritTag(id, meritTag ?? "");
  if (!updated) return NextResponse.json({ error: "Operation not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireOpsAccess();
  if (!user) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { id } = await params;
  const deleted = deleteOperation(id);
  if (!deleted) return NextResponse.json({ error: "Operation not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
