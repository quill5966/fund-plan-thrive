import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { conversations, messages, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

/**
 * GET /api/conversation
 * 
 * Fetches the most recent active conversation for the current user.
 * Returns conversation metadata and message history.
 * Requires userId cookie to be set.
 */
export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get("userId")?.value;

        if (!userId) {
            return NextResponse.json({
                hasSession: false,
                message: "No active session"
            }, { status: 200 });
        }

        // Verify user exists
        const user = await db
            .select()
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        if (user.length === 0) {
            return NextResponse.json({
                hasSession: false,
                message: "User not found"
            }, { status: 200 });
        }

        // Get most recent conversation for this user
        const conversation = await db
            .select()
            .from(conversations)
            .where(eq(conversations.userId, userId))
            .orderBy(desc(conversations.createdAt))
            .limit(1);

        if (conversation.length === 0) {
            return NextResponse.json({
                hasSession: true,
                userName: user[0].name,
                conversationId: null,
                messages: []
            }, { status: 200 });
        }

        // Fetch messages for this conversation
        const conversationMessages = await db
            .select()
            .from(messages)
            .where(eq(messages.conversationId, conversation[0].id))
            .orderBy(messages.createdAt);

        return NextResponse.json({
            hasSession: true,
            userName: user[0].name,
            conversationId: conversation[0].id,
            messages: conversationMessages.map(m => ({
                id: m.id,
                role: m.role,
                content: m.content
            }))
        }, { status: 200 });

    } catch (error) {
        console.error("Error fetching conversation:", error);
        return NextResponse.json({
            error: "Failed to fetch conversation"
        }, { status: 500 });
    }
}
