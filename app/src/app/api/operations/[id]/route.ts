import { NextRequest, NextResponse } from "next/server";
import { updateOperation, deleteOperation } from "@/lib/db";
import { requireOpsAccess } from "@/lib/session";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireOpsAccess();
  if (!user) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { id } = await params;
  const { title, description, status, priority, steps } = await req.json();
  if (!title || !description) {
    return NextResponse.json({ error: "Title and description required" }, { status: 400 });
  }

  const op = updateOperation(id, title, description, status || "active", priority || "medium", steps || []);
  if (!op) return NextResponse.json({ error: "Operation not found" }, { status: 404 });
  return NextResponse.json(op);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireOpsAccess();
  if (!user) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { id } = await params;
  const deleted = deleteOperation(id);
  if (!deleted) return NextResponse.json({ error: "Operation not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
