/**
 * Iron-session configuration and helpers.
 *
 * This is the single place where session/identity is resolved.
 * All API routes and server pages import from here instead of
 * reading raw cookies.
 *
 * Two env vars are required in .env.local:
 *   SESSION_PASSWORD  – 32+ char static key used to encrypt session cookies
 *   APP_PASSPHRASE    – the passphrase users type to unlock the app
 */
import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

// ── Session data stored inside the encrypted cookie ──────────────────
export interface SessionData {
    /** True after the user enters the correct passphrase */
    isAuthenticated: boolean;
    /** DB user id — set after name entry */
    userId?: string;
    /** Display name — set after name entry */
    userName?: string;
}

// ── Session options shared by all callers ─────────────────────────────
export const sessionOptions: SessionOptions = {
    password: process.env.SESSION_PASSWORD as string,
    cookieName: "fpt_session", // "fund-plan-thrive session"
    cookieOptions: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict" as const,
        path: "/",
    },
};

// ── Helpers ───────────────────────────────────────────────────────────

/**
 * Read/write session from Next.js `cookies()`.
 * Works in Server Components, Server Actions, and Route Handlers
 * that use NextResponse (non-streaming).
 */
export async function getSession() {
    const cookieStore = await cookies();
    return getIronSession<SessionData>(cookieStore, sessionOptions);
}

/**
 * Read/write session from a raw NextRequest + Response pair.
 * Required for streaming routes (like /api/chat) where we construct
 * our own Response object and need headers set on it.
 */
export async function getSessionFromRequest(
    req: NextRequest,
    res: Response,
) {
    return getIronSession<SessionData>(req, res, sessionOptions);
}
