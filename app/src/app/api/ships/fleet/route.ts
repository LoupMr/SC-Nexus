import { getOrgFleetShipHangar } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { api401 } from "@/lib/api-utils";

/** Combined hangar for all org members — any signed-in user can read. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return api401();
  const entries = getOrgFleetShipHangar();
  return Response.json({ entries });
}
