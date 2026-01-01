import { generateText, tool, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { financeService } from "@/services/finance";
import { curateResourcesForGoal } from "@/services/resources";

const getCurrentDate = () => new Date().toISOString().split('T')[0];

const getSystemPrompt = (currentGoalsContext: string) => `You are a financial data extraction assistant. 
Your job: Parse user statements about their finances and life goals, and call the appropriate tools.
Current Date: ${getCurrentDate()} (Use this to resolve relative dates like "today", "last month", "October")

${currentGoalsContext}

Rules:
- Extract account TYPE (checking, savings, investment, credit_card, loan, mortgage)
- Extract account NAME (e.g., "Chase Checking", "Amex Gold")
- Extract AMOUNT as a number (no symbols)
- Extract DATE as a datetime (assume Mountain Standard Time). Default to Current Date if not specified.
- Use distinct, specific names (e.g., 'Student Loan', 'Car Loan') rather than generic ones. 
- Distinct debts must have different names to be stored separately.
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
});

const updateDebtSchema = z.object({
    type: z.enum(["credit_card", "loan", "mortgage"]).describe("Type of debt"),
    name: z.string().describe("Account nickname (e.g., 'Chase Sapphire'). Use specific names to distinguish between multiple debts."),
    amount: z.number().describe("Current balance owed"),
    effectiveDate: z.string().optional().describe("Date when this balance was valid (ISO format)"),
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

interface AdvisorResult {
    success: boolean;
    actionsPerformed: string[];
    llmResponse?: string;
    error?: string;
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

            const result = await generateText({
                model: openai("gpt-4o"),
                system: getSystemPrompt(goalsContext),
                prompt: transcribedText,
                tools: {
                    update_asset: tool({
                        description: "Update or create an asset record (bank account, investment, etc.)",
                        inputSchema: updateAssetSchema,
                        execute: async ({ type, name, amount, effectiveDate }) => {
                            const date = effectiveDate ? new Date(effectiveDate) : new Date();
                            await financeService.upsertAsset(userId, type, name, amount, date, "user_input", true);
                            actionsPerformed.push(`Updated asset: ${name} (${type}) = $${amount}`);
                            return { success: true, message: `Updated ${name}` };
                        },
                    }),
                    update_debt: tool({
                        description: "Update or create a debt record (credit card, loan, mortgage)",
                        inputSchema: updateDebtSchema,
                        execute: async ({ type, name, amount, effectiveDate }) => {
                            const date = effectiveDate ? new Date(effectiveDate) : new Date();
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
