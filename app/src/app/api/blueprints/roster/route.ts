import { getBlueprintRoster } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { api401 } from "@/lib/api-utils";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return api401();
  return Response.json(getBlueprintRoster());
}
