import { cookies } from "next/headers";
import { getUserBySession } from "@/lib/db";

const COOKIE_NAME = "sc_nexus_session";

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return getUserBySession(token) || null;
}

export async function requireAdmin() {
  const user = await getSessionUser();
  if (!user || !user.roles?.includes("admin")) return null;
  return user;
}

export async function requireLedgerAccess() {
  const user = await getSessionUser();
  if (!user || (!user.roles?.includes("admin") && !user.roles?.includes("logistics"))) return null;
  return user;
}

export async function requireOpsAccess() {
  const user = await getSessionUser();
  if (!user || (!user.roles?.includes("admin") && !user.roles?.includes("ops"))) return null;
  return user;
}

export async function requireRaffleAccess() {
  const user = await getSessionUser();
  if (!user || (!user.roles?.includes("admin") && !user.roles?.includes("raffle"))) return null;
  return user;
}

export async function requireGuideAccess() {
  const user = await getSessionUser();
  if (!user || (!user.roles?.includes("admin") && !user.roles?.includes("guide"))) return null;
  return user;
}

export { COOKIE_NAME };
