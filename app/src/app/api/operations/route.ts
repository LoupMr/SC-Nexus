import { NextRequest } from "next/server";
import { getAllOperations, createOperation } from "@/lib/db";
import { getSessionUser, requireOpsAccess } from "@/lib/session";
import { operationCreateSchema } from "@/lib/validations";
import { api400, api401, api403, safeParseJson } from "@/lib/api-utils";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return api401();
  return Response.json(getAllOperations());
}

export async function POST(req: NextRequest) {
  const user = await requireOpsAccess();
  if (!user) return api403("Insufficient permissions");

  const json = await safeParseJson(req);
  if ("error" in json) return json.error;
  const parsed = operationCreateSchema.safeParse(json.data);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "Invalid input";
    return api400(msg);
  }
  const { title, description, status, priority, meritTag, steps } = parsed.data;
  const mappedSteps = steps.map((s, i) => ({
    order: s.order ?? i,
    station: s.station,
    target: s.target,
    requirements: s.requirements ?? "",
    description: s.description,
    mapUrl: s.mapUrl ?? null,
  }));

  const op = createOperation(title, description, status, priority, meritTag, mappedSteps);
  return Response.json(op, { status: 201 });
}
