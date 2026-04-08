import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

/**
 * DELETE /api/session
 * 
 * Destroys the iron-session, clearing the signed+encrypted cookie.
 * Used when restarting as a new user.
 */
export async function DELETE() {
    const session = await getSession();
    session.destroy();

    return NextResponse.json({ success: true });
}
