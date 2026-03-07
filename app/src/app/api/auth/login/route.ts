import { NextRequest, NextResponse } from "next/server";
import { findUserByUsername, verifyPassword, createSession } from "@/lib/db";
import { COOKIE_NAME } from "@/lib/session";
import { loginSchema } from "@/lib/validations";
import { api400, api401 } from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  const parsed = loginSchema.safeParse(await req.json());
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "Invalid input";
    return api400(msg);
  }
  const { username, password } = parsed.data;

  const user = findUserByUsername(username);
  if (!user) return api401("User not found");
  const valid = await verifyPassword(password, user.password_hash, user.id);
  if (!valid) return api401("Incorrect password");

  const token = createSession(user.id);
  const roles = (user.role || "viewer").split(",").map((s) => s.trim()).filter(Boolean);
  const res = NextResponse.json({ username: user.username, role: user.role, roles: roles.length ? roles : ["viewer"], avatarUrl: user.avatar_url ?? null });
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
