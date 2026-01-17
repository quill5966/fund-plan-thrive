import { NextRequest } from "next/server";
import { streamText, tool, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { financeService } from "@/services/finance";
import { speechService } from "@/services/speech/transcribe";
import { userService } from "@/services/user";
import { curateResourcesForGoal } from "@/services/resources";

const getCurrentDate = () => new Date().toISOString().split('T')[0];

const SYSTEM_PROMPT = `You are a professional financial advisor with the user's best interest in mind. You have 20+ years of experience and are deeply knowledgeable about traditional and emerging investment opportunities for personal wealth growth at different stages of life.

CONVERSATION RULES:
- Ask questions ONE AT A TIME. Wait for the user's response before proceeding.
- Everything discussed will be tailored to their situation, not generic advice.
- This consultation is for education and planning purposes only. You won't give tax or legal advice, though you may point out areas where they could benefit from talking with a CPA or attorney.
- Use the provided tools to record financial data and goals data as the user shares it.

CONSULTATION FLOW:

1. On the first interaction with the user, start with this exact preamble: 
   This consultation is for education and planning purposes only. I won't give tax or legal advice, though I may point out areas where you could benefit from talking with a CPA or attorney. We will start with discussing your current financial picture. Once I have a thorough understanding of that, then we will discuss your top 3 life/financial goals. The items we discuss will be documented into the Financial Dashboard and Goals pages, which you can view after our conversation.

2. CURRENT FINANCIAL PICTURE
   Inform the user that you will first ask about their assets and debts. Ask about each category one at a time:
   - Assets: checking/savings, brokerage, retirement (401k/403b/IRA), equity comp (RSUs/ISOs/ESPP), HSA/529, real estate, business interests, crypto
   - Debts: mortgages/HELOCs, student loans, auto loan, credit card balance that you're trying to pay off
   - Monthly after-tax income (sources and variability)
   - Fixed vs flexible spending vs savings rate
   - Emergency fund status (amount and months of coverage)

3. FINANCIAL GOALS
   Once you've obtained enough information on the user's financial picture, ask the user about their current top 3 life/financial goals. Ask follow-up questions about the first goal. Once you've understood the details of the first goal, move onto the second goal follow-up questions. Then move onto the third goal follow-up questions. It's OK if the user says "I don't know" or has fewer than 3 goals
   - Target timing
   - Dollar amount if applicable. If there is a target amount, ask for the progress so far and which account that the user previously mentioned is connected to this target amount.
   - Progress achieved so far on the goal itself, what steps remain

Current Date: ${getCurrentDate()}`;

// Tool schemas
const updateAssetSchema = z.object({
    type: z.enum(["checking", "savings", "investment", "retirement", "hsa", "real_estate", "crypto", "business"]).describe("Type of asset"),
    name: z.string().describe("Account nickname (e.g., 'Chase Checking', 'Fidelity 401k')"),
    amount: z.number().describe("Current balance"),
    effectiveDate: z.string().optional().describe("Date when this balance was valid (ISO format)"),
    // Deduplication fields
    confidenceLevel: z.enum(["high", "low"]).optional().describe("Set to 'low' if unsure this is a new/distinct account vs an existing one"),
    existingAccountName: z.string().optional().describe("If this updates an existing account with a new/clarified name, provide the OLD name here"),
    isNameClarification: z.boolean().optional().describe("True if user is clarifying/enriching an existing account's name (e.g., adding bank name or purpose)"),
});

const updateDebtSchema = z.object({
    type: z.enum(["credit_card", "loan", "mortgage", "heloc", "student_loan", "auto", "margin"]).describe("Type of debt"),
    name: z.string().describe("Account nickname (e.g., 'Chase Sapphire', 'Student Loan')"),
    amount: z.number().describe("Current balance owed"),
    effectiveDate: z.string().optional().describe("Date when this balance was valid (ISO format)"),
    // Deduplication fields
    confidenceLevel: z.enum(["high", "low"]).optional().describe("Set to 'low' if unsure this is a new/distinct debt vs an existing one"),
    existingAccountName: z.string().optional().describe("If this updates an existing debt with a new/clarified name, provide the OLD name here"),
    isNameClarification: z.boolean().optional().describe("True if user is clarifying/enriching an existing debt's name (e.g., adding bank name or purpose)"),
});

const createGoalSchema = z.object({
    title: z.string().describe("Short title of the goal"),
    description: z.string().describe("Detailed description including why it matters"),
    targetAmount: z.number().optional().describe("Financial target amount if applicable"),
    currentAmount: z.number().optional().describe("Amount saved so far towards this goal"),
    steps: z.array(z.object({
        description: z.string().describe("Description of the step"),
        isUserDefined: z.boolean().describe("true if user explicitly mentioned this step")
    })).describe("5-8 actionable steps to achieve this goal"),
});

const updateGoalSchema = z.object({
    id: z.string().describe("UUID of the goal to update"),
    currentAmount: z.number().optional().describe("New saved amount"),
    status: z.enum(['active', 'completed', 'archived']).optional(),
});

/**
 * POST /api/chat
 * 
 * Streaming chat endpoint for live conversation with AI financial advisor.
 * Accepts text or audio input, returns streaming text response.
 */
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const textInput = formData.get("text") as string | null;
        const audioFile = formData.get("audio") as File | null;
        const userName = formData.get("userId") as string;
        const conversationId = formData.get("conversationId") as string | null;

        if (!userName?.trim()) {
            return new Response(JSON.stringify({ error: "Please enter your name." }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        if (!textInput && !audioFile) {
            return new Response(JSON.stringify({ error: "Please provide text or audio input." }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        // 1. Get or create user
        const user = await userService.getOrCreateUser(userName);

        // 2. Handle audio transcription if provided
        let userMessage = textInput || "";
        if (audioFile) {
            const arrayBuffer = await audioFile.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            userMessage = await speechService.transcribeAudio(buffer, audioFile.name);
        }

        // 3. Get or create conversation
        let convoId = conversationId;
        if (!convoId) {
            const [newConvo] = await db.insert(conversations).values({
                userId: user.id,
                status: 'active',
            }).returning();
            convoId = newConvo.id;
        }

        // 4. Save user message
        await db.insert(messages).values({
            conversationId: convoId,
            role: 'user',
            content: userMessage,
        });

        // 5. Load conversation history for context
        const history = await db.select()
            .from(messages)
            .where(eq(messages.conversationId, convoId))
            .orderBy(desc(messages.createdAt))
            .limit(20);

        const messagesForLLM = history.reverse().map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
        }));

        // 6. Fetch existing goals and financial data for context
        const existingGoals = await financeService.getGoals(user.id);
        const goalsContext = existingGoals.length > 0
            ? "\n\nCurrent Goals:\n" + existingGoals.map(g => `- [${g.id}] ${g.title}: ${g.status}`).join("\n")
            : "";

        // Fetch existing assets/debts for deduplication context
        const existingFinances = await financeService.getFinancialSummary(user.id);
        const assetsContext = existingFinances.assets.length > 0
            ? "\n\nCurrent Assets:\n" + existingFinances.assets.map(a =>
                `- [${a.type}] "${a.name}": $${a.value}`).join("\n")
            : "";
        const debtsContext = existingFinances.debts.length > 0
            ? "\n\nCurrent Debts:\n" + existingFinances.debts.map(d =>
                `- [${d.type}] "${d.name}": $${d.value}`).join("\n")
            : "";

        const dedupInstructions = `

**DEDUPLICATION RULES** (CRITICAL):
- Review the 'Current Assets' and 'Current Debts' lists above before calling any update tool
- If user mentions an account that CLEARLY matches an existing one (same name or very similar), use the EXACT existing name
- If user provides MORE DETAIL about an existing account (e.g., adding bank name like "my checking" → "Chase checking"), this is a name clarification:
    * Set isNameClarification=true
    * Set existingAccountName to the OLD name from the list
    * Set name to the NEW clarified name
- **IF UNSURE whether a new account matches an existing one** (e.g., similar amounts but different descriptions, or user mentions a bank name not in the list):
    * DO NOT call the tool yet
    * Instead, ASK THE USER directly: "I noticed you already have [existing account] with $[amount]. Is your [new account description] the same account, or is this a separate one?"
    * Wait for user's response before proceeding
    * If user confirms it's the same: use isNameClarification=true with existingAccountName
    * If user says it's different: create a new record with a distinct name`;

        // Create tools with user context closure
        const createTools = (userId: string) => ({
            update_asset: tool({
                description: "Record an asset (bank account, investment, retirement, etc.)",
                inputSchema: updateAssetSchema,
                execute: async ({ type, name, amount, effectiveDate, confidenceLevel, existingAccountName, isNameClarification }) => {
                    const date = effectiveDate ? new Date(effectiveDate) : new Date();

                    // Handle name clarification - merge with existing account
                    if (isNameClarification && existingAccountName) {
                        await financeService.mergeAsset(userId, existingAccountName, name, type, amount, date);
                        return { success: true, message: `Updated ${existingAccountName} to ${name}: $${amount.toLocaleString()}` };
                    }

                    // Standard upsert (low confidence cases will still create - UI handles confirmation)
                    await financeService.upsertAsset(userId, type, name, amount, date, "user_input", true);
                    return { success: true, message: `Recorded ${name}: $${amount.toLocaleString()}` };
                },
            }),
            update_debt: tool({
                description: "Record a debt (credit card, loan, mortgage, etc.)",
                inputSchema: updateDebtSchema,
                execute: async ({ type, name, amount, effectiveDate, confidenceLevel, existingAccountName, isNameClarification }) => {
                    const date = effectiveDate ? new Date(effectiveDate) : new Date();

                    // Handle name clarification - merge with existing debt
                    if (isNameClarification && existingAccountName) {
                        await financeService.mergeDebt(userId, existingAccountName, name, type, amount, date);
                        return { success: true, message: `Updated ${existingAccountName} to ${name}: $${amount.toLocaleString()}` };
                    }

                    // Standard upsert
                    await financeService.upsertDebt(userId, type, name, amount, date, "user_input", true);
                    return { success: true, message: `Recorded ${name}: $${amount.toLocaleString()}` };
                },
            }),
            create_goal: tool({
                description: "Create a new financial or life goal",
                inputSchema: createGoalSchema,
                execute: async (data) => {
                    const goalResult = await financeService.createGoal(userId, data);
                    curateResourcesForGoal(goalResult.goalId, data.title)
                        .then(() => console.log(`[Curation] Completed for goal: ${data.title}`))
                        .catch(err => console.error(`[Curation] Failed for goal: ${data.title}`, err));
                    return { success: true, message: `Created goal: ${data.title}` };
                },
            }),
            update_goal: tool({
                description: "Update an existing goal's progress or status",
                inputSchema: updateGoalSchema,
                execute: async (data) => {
                    await financeService.updateGoal(userId, data.id, {
                        currentAmount: data.currentAmount,
                        status: data.status,
                    });
                    return { success: true, message: `Updated goal` };
                },
            }),
        });

        // 7. Stream response
        const result = streamText({
            model: openai("gpt-4o"),
            system: SYSTEM_PROMPT + goalsContext + assetsContext + debtsContext + dedupInstructions,
            messages: messagesForLLM,
            tools: createTools(user.id),
            stopWhen: stepCountIs(10),
            onFinish: async ({ text }) => {
                // Save assistant response
                if (text) {
                    await db.insert(messages).values({
                        conversationId: convoId!,
                        role: 'assistant',
                        content: text,
                    });
                }
            },
        });

        // Return streaming response with conversation metadata
        const response = result.toTextStreamResponse();

        // Set userId cookie for session (required for dashboard/goals pages)
        const cookieValue = `userId=${user.id}; Path=/; Max-Age=${60 * 60 * 24 * 7}; HttpOnly; SameSite=Strict`;
        response.headers.set("Set-Cookie", cookieValue);

        // Add conversation ID and transcription to headers for client
        response.headers.set("X-Conversation-Id", convoId);
        if (audioFile) {
            response.headers.set("X-Transcription", encodeURIComponent(userMessage));
        }

        return response;

    } catch (error) {
        console.error("Error in chat API:", error);
        return new Response(JSON.stringify({ error: "Failed to process message." }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
