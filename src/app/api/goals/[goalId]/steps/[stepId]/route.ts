import { NextRequest, NextResponse } from "next/server";
import { financeService } from "@/services/finance";
import { validateStep } from "@/lib/validation";
import { getSession } from "@/lib/session";

type Params = Promise<{ goalId: string; stepId: string }>;

/**
 * PUT /api/goals/[goalId]/steps/[stepId]
 * Body: { description: string }
 * Updates a step's description.
 */
export async function PUT(request: NextRequest, { params }: { params: Params }) {
    try {
        const { stepId } = await params;
        const session = await getSession();
        const userId = session.isAuthenticated ? session.userId : undefined;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { description } = body;

        if (typeof description !== "string") {
            return NextResponse.json(
                { error: "Body must include description (string)." },
                { status: 400 }
            );
        }

        const validation = validateStep(description);
        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        const step = await financeService.updateStep(stepId, userId, description);
        return NextResponse.json({ step });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal server error";
        const status = message === "Unauthorized" ? 403 : message === "Step not found" ? 404 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}

/**
 * DELETE /api/goals/[goalId]/steps/[stepId]
 * Permanently removes a step and all its children (tasks, resources).
 */
export async function DELETE(request: NextRequest, { params }: { params: Params }) {
    try {
        const { stepId } = await params;
        const session = await getSession();
        const userId = session.isAuthenticated ? session.userId : undefined;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await financeService.deleteStep(stepId, userId);
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal server error";
        const status = message === "Unauthorized" ? 403 : message === "Step not found" ? 404 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
