import { NextRequest, NextResponse } from "next/server";
import { financeService } from "@/services/finance";
import { validateTaskDescription } from "@/lib/validation";
import { getSession } from "@/lib/session";

type Params = Promise<{ goalId: string; stepId: string; taskId: string }>;

/**
 * PUT /api/goals/[goalId]/steps/[stepId]/tasks/[taskId]
 * Body: { description: string, isCompleted: boolean }
 *
 * Full replacement of mutable task fields. Idempotent — calling multiple
 * times with the same body always produces the same result.
 *
 * The handler inspects which field(s) differ from the current record and
 * calls the appropriate focused service method (toggleStepTask or
 * updateStepTask), keeping service methods single-purpose.
 */
export async function PUT(request: NextRequest, { params }: { params: Params }) {
    try {
        const { taskId } = await params;
        const session = await getSession();
        const userId = session.isAuthenticated ? session.userId : undefined;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { description, isCompleted } = body;

        if (typeof description !== "string" || typeof isCompleted !== "boolean") {
            return NextResponse.json(
                { error: "Body must include description (string) and isCompleted (boolean)." },
                { status: 400 }
            );
        }

        const validation = validateTaskDescription(description);
        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        // Fetch current state to determine which field(s) changed
        const [currentTasks] = await financeService.getTasksForStep(
            (await params).stepId,
            userId
        ).then(tasks => tasks.filter(t => t.id === taskId));

        if (!currentTasks) {
            return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }

        let updated = currentTasks;

        if (description.trim() !== currentTasks.description) {
            updated = await financeService.updateStepTask(taskId, userId, description);
        }
        if (isCompleted !== currentTasks.isCompleted) {
            updated = await financeService.toggleStepTask(taskId, userId);
        }

        return NextResponse.json({ task: updated });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal server error";
        const status = message === "Unauthorized" ? 403 : message === "Task not found" ? 404 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}

/**
 * DELETE /api/goals/[goalId]/steps/[stepId]/tasks/[taskId]
 * Permanently removes a task.
 */
export async function DELETE(request: NextRequest, { params }: { params: Params }) {
    try {
        const { taskId } = await params;
        const session = await getSession();
        const userId = session.isAuthenticated ? session.userId : undefined;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await financeService.deleteStepTask(taskId, userId);
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal server error";
        const status = message === "Unauthorized" ? 403 : message === "Task not found" ? 404 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
