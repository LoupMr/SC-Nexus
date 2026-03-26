import { NextRequest } from "next/server";
import {
  getMemberShipHangarForUser,
  setMemberShipHangar,
} from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { shipHangarPutSchema } from "@/lib/validations";
import { api400, api401, safeParseJson } from "@/lib/api-utils";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return api401();
  const rows = getMemberShipHangarForUser(user.id);
  return Response.json({
    entries: rows.map((r) => ({
      shipSlug: r.shipSlug,
      acquisition: r.acquisition,
      updatedAt: r.updatedAt,
    })),
  });
}

export async function PUT(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return api401();

  const json = await safeParseJson(req);
  if ("error" in json) return json.error;
  const parsed = shipHangarPutSchema.safeParse(json.data);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "Invalid input";
    return api400(msg);
  }

  const { shipSlug, acquisition } = parsed.data;
  setMemberShipHangar(user.id, shipSlug, acquisition);
  return Response.json({ ok: true });
}
