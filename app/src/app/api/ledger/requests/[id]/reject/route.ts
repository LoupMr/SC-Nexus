import { NextRequest } from "next/server";
import { rejectLedgerRequest } from "@/lib/db";
import { requireLedgerAccess } from "@/lib/session";
import { ledgerRejectSchema } from "@/lib/validations";
import { api401, api404, parseJsonOrEmpty } from "@/lib/api-utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireLedgerAccess();
  if (!user) return api401("Logistics role required");

  const { id } = await params;
  const body = await parseJsonOrEmpty(req);
  const parsed = ledgerRejectSchema.safeParse(body);
  const reason = parsed.success ? parsed.data.reason : undefined;

  const request = rejectLedgerRequest(id, user.username, reason);
  if (!request) return api404("Request not found or not pending");
  return Response.json(request);
}
