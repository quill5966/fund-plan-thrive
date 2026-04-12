import { NextRequest, NextResponse } from "next/server";
import { financeService } from "@/services/finance";
import { validateTaskDescription } from "@/lib/validation";
import { getSession } from "@/lib/session";

type Params = Promise<{ goalId: string; stepId: string }>;

/**
 * GET /api/goals/[goalId]/steps/[stepId]/tasks
 * Returns all tasks for a step, ordered by `order` ASC.
 */
export async function GET(request: NextRequest, { params }: { params: Params }) {
    try {
        const { stepId } = await params;
        const session = await getSession();
        const userId = session.isAuthenticated ? session.userId : undefined;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const tasks = await financeService.getTasksForStep(stepId, userId);
        return NextResponse.json({ tasks });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal server error";
        const status = message === "Unauthorized" ? 403 : message === "Step not found" ? 404 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}

/**
 * POST /api/goals/[goalId]/steps/[stepId]/tasks
 * Body: { description: string }
 * Creates a new task for the step.
 */
export async function POST(request: NextRequest, { params }: { params: Params }) {
    try {
        const { stepId } = await params;
        const session = await getSession();
        const userId = session.isAuthenticated ? session.userId : undefined;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { description } = body;

        const validation = validateTaskDescription(description ?? "");
        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        const task = await financeService.createStepTask(stepId, userId, description);
        return NextResponse.json({ task }, { status: 201 });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal server error";
        const status = message === "Unauthorized" ? 403 : message === "Step not found" ? 404 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
