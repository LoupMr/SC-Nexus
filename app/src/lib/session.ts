import { cookies } from "next/headers";
import { getUserBySession } from "@/lib/db";

const COOKIE_NAME = "sc_nexus_session";

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return getUserBySession(token) || null;
}

/** Generic role check: returns user if they have any of the given roles, null otherwise. */
export async function requireRole(allowedRoles: string[]) {
  const user = await getSessionUser();
  if (!user) return null;
  const hasRole = allowedRoles.some((r) => user.roles?.includes(r));
  return hasRole ? user : null;
}

export async function requireAdmin() {
  return requireRole(["admin"]);
}

export async function requireLedgerAccess() {
  return requireRole(["admin", "logistics"]);
}

export async function requireOpsAccess() {
  return requireRole(["admin", "ops"]);
}

export async function requireRaffleAccess() {
  return requireRole(["admin", "raffle"]);
}

export async function requireGuideAccess() {
  return requireRole(["admin", "guide"]);
}

export { COOKIE_NAME };
