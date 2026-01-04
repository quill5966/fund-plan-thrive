import { NextResponse } from "next/server";

/**
 * DELETE /api/session
 * 
 * Clears the user session by expiring the userId cookie.
 * Used when restarting as a new user.
 */
export async function DELETE() {
    const response = NextResponse.json({ success: true });

    // Expire the userId cookie by setting Max-Age to 0
    response.cookies.set("userId", "", {
        path: "/",
        maxAge: 0,
        httpOnly: true,
        sameSite: "strict",
    });

    return response;
}
