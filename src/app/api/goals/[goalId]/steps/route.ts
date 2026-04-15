import { NextRequest, NextResponse } from "next/server";
import { financeService } from "@/services/finance";
import { validateStep } from "@/lib/validation";
import { getSession } from "@/lib/session";

type Params = Promise<{ goalId: string }>;

/**
 * POST /api/goals/[goalId]/steps
 * Body: { description: string }
 * Creates a new step for the goal.
 */
export async function POST(request: NextRequest, { params }: { params: Params }) {
    try {
        const { goalId } = await params;
        const session = await getSession();
        const userId = session.isAuthenticated ? session.userId : undefined;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { description } = body;

        const validation = validateStep(description ?? "");
        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        const step = await financeService.createStep(goalId, userId, description);
        return NextResponse.json({ step }, { status: 201 });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal server error";
        const status = message === "Unauthorized" ? 403 : message === "Goal not found" ? 404 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
