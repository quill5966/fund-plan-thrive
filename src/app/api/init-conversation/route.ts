import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { conversations, messages, users } from "@/db/schema";
import { userService } from "@/services/user";
import { eq, desc } from "drizzle-orm";

/**
 * TODO: AUTH_REFACTOR
 * This endpoint uses name-based user identification for MVP simplicity.
 * When migrating to proper authentication:
 * 1. Replace userName from request body with authenticated session user
 * 2. Add auth middleware to protect this endpoint
 * 3. Remove the Set-Cookie logic (session will be handled by auth provider)
 */

// Welcome message that the AI advisor leads with for new users
const WELCOME_MESSAGE = `This consultation is for education and planning purposes only. I won't give tax or legal advice, though I may point out areas where you could benefit from talking with a CPA or attorney.

We will start with discussing your current financial picture. Once I have a thorough understanding of that, we'll talk about your top 3 life/financial goals. The items we discuss will be documented into the Financial Dashboard and Goals pages, which you can view after our conversation.

Let's begin with your current financial picture. Could you tell me about your assets such as checking or savings accounts?`;

/**
 * POST /api/init-conversation
 * 
 * Initializes a conversation based on user status:
 * - NEW user (not in DB): Creates user, conversation, and welcome message
 * - RETURNING user (exists with conversation history): Returns existing conversation
 * - EXISTING user (no conversation history): Creates conversation with welcome message
 * 
 * Request body: { userName: string }
 * Response: { isNewUser: boolean, conversationId: string, messages: [...] }
 */
export async function POST(request: NextRequest) {
    try {
        const { userName } = await request.json();

        if (!userName?.trim()) {
            return NextResponse.json(
                { error: "User name is required" },
                { status: 400 }
            );
        }

        const trimmedName = userName.trim();

        // TODO: AUTH_REFACTOR - Replace with authenticated session check
        // Check if user already exists in database
        const existingUser = await db
            .select()
            .from(users)
            .where(eq(users.name, trimmedName))
            .limit(1);

        if (existingUser.length > 0) {
            // User exists - check for existing conversation
            const existingConvo = await db
                .select()
                .from(conversations)
                .where(eq(conversations.userId, existingUser[0].id))
                .orderBy(desc(conversations.createdAt))
                .limit(1);

            if (existingConvo.length > 0) {
                // Returning user with conversation history - load their messages
                const existingMessages = await db
                    .select()
                    .from(messages)
                    .where(eq(messages.conversationId, existingConvo[0].id))
                    .orderBy(messages.createdAt);

                const response = NextResponse.json({
                    isNewUser: false,
                    conversationId: existingConvo[0].id,
                    messages: existingMessages.map(m => ({
                        id: m.id,
                        role: m.role,
                        content: m.content,
                    })),
                });

                // Set cookie for session
                response.cookies.set("userId", existingUser[0].id, {
                    path: "/",
                    maxAge: 60 * 60 * 24 * 7,
                    httpOnly: true,
                    sameSite: "strict",
                });

                return response;
            }
        }

        // New user OR existing user without conversation - create welcome message
        const user = await userService.getOrCreateUser(trimmedName);

        const [newConversation] = await db
            .insert(conversations)
            .values({
                userId: user.id,
                status: "active",
            })
            .returning();

        const [welcomeMsg] = await db
            .insert(messages)
            .values({
                conversationId: newConversation.id,
                role: "assistant",
                content: WELCOME_MESSAGE,
            })
            .returning();

        const response = NextResponse.json({
            isNewUser: true,
            conversationId: newConversation.id,
            messages: [{
                id: welcomeMsg.id,
                role: welcomeMsg.role,
                content: welcomeMsg.content,
            }],
        });

        // TODO: AUTH_REFACTOR - Remove this cookie logic; auth provider will handle sessions
        response.cookies.set("userId", user.id, {
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
            httpOnly: true,
            sameSite: "strict",
        });

        return response;
    } catch (error) {
        console.error("Error initializing conversation:", error);
        return NextResponse.json(
            { error: "Failed to initialize conversation" },
            { status: 500 }
        );
    }
}

