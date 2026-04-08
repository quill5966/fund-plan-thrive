import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

/**
 * POST /api/auth/login
 *
 * Validates the passphrase and creates an authenticated iron-session.
 * Request body: { passphrase: string }
 */
export async function POST(request: Request) {
    try {
        const { passphrase } = await request.json();

        if (!passphrase?.trim()) {
            return NextResponse.json(
                { error: "Passphrase is required" },
                { status: 400 },
            );
        }

        const expected = process.env.APP_PASSPHRASE;
        if (!expected) {
            console.error("APP_PASSPHRASE is not set in environment variables");
            return NextResponse.json(
                { error: "Server configuration error" },
                { status: 500 },
            );
        }

        if (passphrase.trim() !== expected) {
            return NextResponse.json(
                { error: "Incorrect passphrase" },
                { status: 401 },
            );
        }

        // Passphrase is correct — create authenticated session
        const session = await getSession();
        session.isAuthenticated = true;
        await session.save();

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error in /api/auth/login:", error);
        return NextResponse.json(
            { error: "Failed to authenticate" },
            { status: 500 },
        );
    }
}
