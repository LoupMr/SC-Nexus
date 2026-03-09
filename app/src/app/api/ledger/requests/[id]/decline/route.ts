import { NextRequest } from "next/server";
import { declineLedgerRequestHandoff } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { ledgerDeclineSchema } from "@/lib/validations";
import { api401, api404, parseJsonOrEmpty } from "@/lib/api-utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return api401();

  const { id } = await params;
  const body = await parseJsonOrEmpty(req);
  const parsed = ledgerDeclineSchema.safeParse(body);
  const reason = parsed.success ? parsed.data.reason : undefined;

  const request = declineLedgerRequestHandoff(id, user.username, reason);
  if (!request) return api404("Request not found or you are not the owner of any items in this request");
  return Response.json(request);
}
