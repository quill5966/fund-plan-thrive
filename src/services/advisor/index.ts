import { generateText, tool, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { financeService } from "@/services/finance";
import { curateResourcesForGoal } from "@/services/resources";

const getCurrentDate = () => new Date().toISOString().split('T')[0];

const getSystemPrompt = (currentGoalsContext: string, assetsContext: string, debtsContext: string) => `You are a financial data extraction assistant. 
Your job: Parse user statements about their finances and life goals, and call the appropriate tools.
Current Date: ${getCurrentDate()} (Use this to resolve relative dates like "today", "last month", "October")

${assetsContext}

${debtsContext}

${currentGoalsContext}

Rules:
- Extract account TYPE (checking, savings, investment, credit_card, loan, mortgage)
- Extract account NAME (e.g., "Chase Checking", "Amex Gold")
- Extract AMOUNT as a number (no symbols)
- Extract DATE as a datetime (assume Mountain Standard Time). Default to Current Date if not specified.
- Use distinct, specific names (e.g., 'Student Loan', 'Car Loan') rather than generic ones. 
- Distinct debts must have different names to be stored separately.
- **DEDUPLICATION RULES** (CRITICAL):
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
        * If user says it's different: create a new record with a distinct name
- If user mentions PAST balances (history), call the tool SEPARATELY for each data point with its specific effectiveDate.
- If user says they "closed" an account, call close_account
- **GOAL EXTRACTION**:
    - Review the list of 'Current Goals'. If the user mentions a goal that semantically matches one of these, use 'update_goal'. Only use 'create_goal' for net-new objectives.
    - When creating a goal, you MUST **GENERATE 5-8 actionable steps** to achieve the goal. Combine:
        1. Any steps the user explicitly mentioned (mark isUserDefined=true)
        2. Additional logical steps you generate (mark isUserDefined=false)
    - **ALWAYS include user-mentioned steps** - never ignore them. Place all steps in the correct logical order for completing the goal.
    - Example steps for "Buy a House": Research neighborhoods, Get pre-approved for mortgage, Save for down payment, Find a real estate agent, Search for properties, Make an offer, Complete inspection, Close on the house.
    - **DO NOT generate resource links** - resources are curated automatically after goal creation.
    - If you have enough information to create the goal (title, target amount if applicable), **CALL THE TOOL IMMEDIATELY**. Do not ask for confirmation.
- Only call tools when you have all required data
- Do not make up data—if unclear, do not call a tool`;

// Zod schemas for tool parameters
const updateAssetSchema = z.object({
    type: z.enum(["checking", "savings", "investment"]).describe("Type of asset"),
    name: z.string().describe("Account nickname (e.g., 'Chase Checking'). Use specific names to distinguish between multiple assets."),
    amount: z.number().describe("Current balance"),
    effectiveDate: z.string().optional().describe("Date when this balance was valid (ISO format)"),
    // Deduplication fields
    confidenceLevel: z.enum(["high", "low"]).optional().describe("Set to 'low' if unsure this is a new/distinct account vs an existing one"),
    existingAccountName: z.string().optional().describe("If this updates an existing account with a new/clarified name, provide the OLD name here"),
    isNameClarification: z.boolean().optional().describe("True if user is clarifying/enriching an existing account's name (e.g., adding bank name or purpose)"),
});

const updateDebtSchema = z.object({
    type: z.enum(["credit_card", "loan", "mortgage"]).describe("Type of debt"),
    name: z.string().describe("Account nickname (e.g., 'Chase Sapphire'). Use specific names to distinguish between multiple debts."),
    amount: z.number().describe("Current balance owed"),
    effectiveDate: z.string().optional().describe("Date when this balance was valid (ISO format)"),
    // Deduplication fields
    confidenceLevel: z.enum(["high", "low"]).optional().describe("Set to 'low' if unsure this is a new/distinct debt vs an existing one"),
    existingAccountName: z.string().optional().describe("If this updates an existing debt with a new/clarified name, provide the OLD name here"),
    isNameClarification: z.boolean().optional().describe("True if user is clarifying/enriching an existing debt's name (e.g., adding bank name or purpose)"),
});

const closeAccountSchema = z.object({
    type: z.enum(["checking", "savings", "investment", "credit_card", "loan", "mortgage"]),
    name: z.string().describe("Account nickname to close"),
});

const createGoalSchema = z.object({
    title: z.string().describe("Short title of the goal"),
    description: z.string().describe("Detailed description of the goal"),
    targetAmount: z.number().optional().describe("Financial target amount if applicable"),
    currentAmount: z.number().optional().describe("Amount saved so far towards this goal"),
    steps: z.array(z.object({
        description: z.string().describe("Description of the step"),
        isUserDefined: z.boolean().describe("true if user explicitly mentioned this step, false if AI-generated")
    })).describe("List of high-level steps (max 8) to achieve this goal, in logical order"),
    // Note: resources are now curated automatically via Resource Curation Service
});

const updateGoalSchema = z.object({
    id: z.string().describe("UUID of the goal to update"),
    currentAmount: z.number().optional().describe("New saved amount"),
    status: z.enum(['active', 'completed', 'archived']).optional(),
    newSteps: z.array(z.string()).optional().describe("New steps to append to the goal")
});

interface PendingConfirmation {
    entityType: "asset" | "debt";
    pendingAction: {
        type: string;
        name: string;
        amount: number;
        effectiveDate?: string;
    };
    potentialMatches: { name: string; value: number }[];
    message: string;
}

interface AdvisorResult {
    success: boolean;
    actionsPerformed: string[];
    llmResponse?: string;
    error?: string;
    pendingConfirmation?: PendingConfirmation;
}

export const advisorService = {
    /**
     * Processes transcribed text through the LLM to extract and update financial data.
     */
    async processTranscription(userId: string, transcribedText: string): Promise<AdvisorResult> {
        const actionsPerformed: string[] = [];

        try {
            // 1. Fetch existing goals for context
            const existingGoals = await financeService.getGoals(userId);
            const goalsContext = existingGoals.length > 0
                ? "Current Goals:\n" + existingGoals.map(g => `- [${g.id}] ${g.title}: ${g.status} (Progress: $${g.currentAmount}/$${g.targetAmount})`).join("\n")
                : "Current Goals: None";

            // 2. Fetch existing assets/debts for deduplication context
            const existingFinances = await financeService.getFinancialSummary(userId);
            const assetsContext = existingFinances.assets.length > 0
                ? "Current Assets:\n" + existingFinances.assets.map(a =>
                    `- [${a.type}] "${a.name}": $${a.value}`).join("\n")
                : "Current Assets: None";
            const debtsContext = existingFinances.debts.length > 0
                ? "Current Debts:\n" + existingFinances.debts.map(d =>
                    `- [${d.type}] "${d.name}": $${d.value}`).join("\n")
                : "Current Debts: None";

            const result = await generateText({
                model: openai("gpt-4o"),
                system: getSystemPrompt(goalsContext, assetsContext, debtsContext),
                prompt: transcribedText,
                tools: {
                    update_asset: tool({
                        description: "Update or create an asset record (bank account, investment, etc.)",
                        inputSchema: updateAssetSchema,
                        execute: async ({ type, name, amount, effectiveDate, confidenceLevel, existingAccountName, isNameClarification }) => {
                            const date = effectiveDate ? new Date(effectiveDate) : new Date();

                            // Handle low confidence - return for user confirmation
                            if (confidenceLevel === "low") {
                                return {
                                    needsConfirmation: true,
                                    pendingAction: { entityType: "asset", type, name, amount, effectiveDate },
                                    potentialMatches: existingFinances.assets
                                        .filter(a => a.type === type)
                                        .map(a => ({ name: a.name, value: Number(a.value) })),
                                    message: `Is "${name}" the same as one of your existing accounts?`
                                };
                            }

                            // Handle name clarification - merge with existing account
                            if (isNameClarification && existingAccountName) {
                                await financeService.mergeAsset(userId, existingAccountName, name, type, amount, date);
                                actionsPerformed.push(`Merged asset: ${existingAccountName} → ${name} (${type}) = $${amount}`);
                                return { success: true, message: `Updated ${existingAccountName} to ${name}` };
                            }

                            // Standard upsert
                            await financeService.upsertAsset(userId, type, name, amount, date, "user_input", true);
                            actionsPerformed.push(`Updated asset: ${name} (${type}) = $${amount}`);
                            return { success: true, message: `Updated ${name}` };
                        },
                    }),
                    update_debt: tool({
                        description: "Update or create a debt record (credit card, loan, mortgage)",
                        inputSchema: updateDebtSchema,
                        execute: async ({ type, name, amount, effectiveDate, confidenceLevel, existingAccountName, isNameClarification }) => {
                            const date = effectiveDate ? new Date(effectiveDate) : new Date();

                            // Handle low confidence - return for user confirmation
                            if (confidenceLevel === "low") {
                                return {
                                    needsConfirmation: true,
                                    pendingAction: { entityType: "debt", type, name, amount, effectiveDate },
                                    potentialMatches: existingFinances.debts
                                        .filter(d => d.type === type)
                                        .map(d => ({ name: d.name, value: Number(d.value) })),
                                    message: `Is "${name}" the same as one of your existing debts?`
                                };
                            }

                            // Handle name clarification - merge with existing debt
                            if (isNameClarification && existingAccountName) {
                                await financeService.mergeDebt(userId, existingAccountName, name, type, amount, date);
                                actionsPerformed.push(`Merged debt: ${existingAccountName} → ${name} (${type}) = $${amount}`);
                                return { success: true, message: `Updated ${existingAccountName} to ${name}` };
                            }

                            // Standard upsert
                            await financeService.upsertDebt(userId, type, name, amount, date, "user_input", true);
                            actionsPerformed.push(`Updated debt: ${name} (${type}) = $${amount}`);
                            return { success: true, message: `Updated ${name}` };
                        },
                    }),
                    close_account: tool({
                        description: "Mark an account as closed/inactive",
                        inputSchema: closeAccountSchema,
                        execute: async ({ type, name }) => {
                            // Determine if asset or debt based on type
                            if (["checking", "savings", "investment"].includes(type)) {
                                await financeService.upsertAsset(userId, type, name, 0, new Date(), "user_input", false);
                            } else {
                                await financeService.upsertDebt(userId, type, name, 0, new Date(), "user_input", false);
                            }
                            actionsPerformed.push(`Closed account: ${name} (${type})`);
                            return { success: true, message: `Closed ${name}` };
                        },
                    }),
                    create_goal: tool({
                        description: "Create a new life/financial goal",
                        inputSchema: createGoalSchema,
                        execute: async (data) => {
                            const result = await financeService.createGoal(userId, data);

                            // Check if this was a duplicate (existing goal returned)
                            if (result.deduplicated) {
                                actionsPerformed.push(`Found existing goal similar to: ${data.title}`);
                                return {
                                    success: true,
                                    existingGoalId: result.goalId,
                                    message: `A similar goal already exists (ID: ${result.goalId}). Use update_goal if you need to modify it.`
                                };
                            }

                            // Trigger async resource curation (fire-and-forget)
                            // This runs in background without blocking the conversation
                            curateResourcesForGoal(result.goalId, data.title)
                                .then(() => console.log(`[Curation] Completed for goal: ${data.title}`))
                                .catch(err => console.error(`[Curation] Failed for goal: ${data.title}`, err));

                            actionsPerformed.push(`Created goal: ${data.title}`);
                            return { success: true, message: `Created goal ${data.title}. Resources are being curated...` };
                        }
                    }),
                    update_goal: tool({
                        description: "Update an existing goal",
                        inputSchema: updateGoalSchema,
                        execute: async (data) => {
                            await financeService.updateGoal(userId, data.id, {
                                currentAmount: data.currentAmount,
                                status: data.status,
                                newSteps: data.newSteps
                            });
                            actionsPerformed.push(`Updated goal: ${data.id}`);
                            return { success: true, message: `Updated goal ${data.id}` };
                        }
                    })
                },
                stopWhen: stepCountIs(30), // Allow multiple tool calls if user mentions multiple accounts
            });

            return {
                success: true,
                actionsPerformed,
                llmResponse: result.text,
            };
        } catch (error) {
            console.error("Error in advisor service:", error);
            return {
                success: false,
                actionsPerformed,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    },
};
