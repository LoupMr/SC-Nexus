import { NextRequest } from "next/server";
import { updateOperation, deleteOperation, updateOperationMeritTag } from "@/lib/db";
import { requireOpsAccess, requireAdmin } from "@/lib/session";
import { operationUpdateSchema, operationMeritTagSchema } from "@/lib/validations";
import { api400, api403, api404, safeParseJson } from "@/lib/api-utils";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireOpsAccess();
  if (!user) return api403("Insufficient permissions");

  const json = await safeParseJson(req);
  if ("error" in json) return json.error;
  const parsed = operationUpdateSchema.safeParse(json.data);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "Invalid input";
    return api400(msg);
  }
  const { id } = await params;
  const { title, description, status, priority, meritTag, steps } = parsed.data;
  const mappedSteps = steps.map((s, i) => ({
    order: s.order ?? i,
    station: s.station,
    target: s.target,
    requirements: s.requirements ?? "",
    description: s.description,
    mapUrl: s.mapUrl ?? null,
  }));

  const op = updateOperation(id, title, description, status, priority, meritTag, mappedSteps);
  if (!op) return api404("Operation not found");
  return Response.json(op);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return api403("Admin required");

  const json = await safeParseJson(req);
  if ("error" in json) return json.error;
  const parsed = operationMeritTagSchema.safeParse(json.data);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "Invalid input";
    return api400(msg);
  }
  const { id } = await params;
  const updated = updateOperationMeritTag(id, parsed.data.meritTag);
  if (!updated) return api404("Operation not found");
  return Response.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireOpsAccess();
  if (!user) return api403("Insufficient permissions");

  const { id } = await params;
  const deleted = deleteOperation(id);
  if (!deleted) return api404("Operation not found");
  return Response.json({ ok: true });
}
