import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

/**
 * GET /api/auth/check
 *
 * Returns the current authentication status.
 * Used by the client to determine whether to show the passphrase gate.
 */
export async function GET() {
    try {
        const session = await getSession();
        return NextResponse.json({
            authenticated: session.isAuthenticated === true,
        });
    } catch {
        return NextResponse.json({ authenticated: false });
    }
}
