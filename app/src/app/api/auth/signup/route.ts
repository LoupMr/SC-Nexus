import { NextRequest, NextResponse } from "next/server";
import { findUserByUsername, createUser, hashPassword, createSession, getPasskey } from "@/lib/db";
import { COOKIE_NAME } from "@/lib/session";
import { signupSchema } from "@/lib/validations";
import { api400, api403, api409, safeParseJson } from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  const json = await safeParseJson(req);
  if ("error" in json) return json.error;
  const parsed = signupSchema.safeParse(json.data);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "Invalid input";
    return api400(msg);
  }
  const { username, password, passkey } = parsed.data;

  const currentPasskey = getPasskey();
  if (passkey !== currentPasskey) return api403("Invalid passkey");

  if (findUserByUsername(username)) return api409("Username already taken");

  const passwordHash = await hashPassword(password);
  const user = createUser(username, passwordHash, "viewer");
  const token = createSession(user.id);
  const res = NextResponse.json({ username: user.username, role: user.role, roles: ["viewer"], avatarUrl: user.avatar_url ?? null });
  const isProd = process.env.NODE_ENV === "production";
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: isProd ? "strict" : "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: isProd,
  });
  return res;
}
