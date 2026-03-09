import { NextRequest, NextResponse } from "next/server";

export interface ApiError {
  error: string;
  code?: string;
}

export function apiError(message: string, status: number, code?: string) {
  return NextResponse.json({ error: message, code } as ApiError, { status });
}

export function api400(message: string) {
  return apiError(message, 400, "BAD_REQUEST");
}

export function api401(message = "Unauthorized") {
  return apiError(message, 401, "UNAUTHORIZED");
}

export function api403(message = "Forbidden") {
  return apiError(message, 403, "FORBIDDEN");
}

export function api404(message = "Not found") {
  return apiError(message, 404, "NOT_FOUND");
}

export function api409(message: string) {
  return apiError(message, 409, "CONFLICT");
}

export function api500(message = "Internal server error") {
  return apiError(message, 500, "INTERNAL_ERROR");
}

/** Safely parse JSON from request body. Returns 400 on failure. */
export async function safeParseJson<T = unknown>(req: NextRequest): Promise<{ data: T } | { error: NextResponse }> {
  try {
    const data = (await req.json()) as T;
    return { data };
  } catch {
    return { error: api400("Invalid JSON body") };
  }
}

/** Parse JSON from request body. Returns empty object on failure (for optional-body routes). */
export async function parseJsonOrEmpty<T = Record<string, unknown>>(req: NextRequest): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}
