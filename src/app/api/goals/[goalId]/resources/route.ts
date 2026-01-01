import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { goals, goalSteps, goalResources } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

interface Resource {
    id: string;
    title: string;
    url: string;
}

interface ResourcesByStep {
    [stepId: string]: Resource[];
}

/**
 * GET /api/goals/[goalId]/resources
 * 
 * Returns resources for a specific goal, grouped by step ID.
 * Used for polling to check for newly curated resources.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ goalId: string }> }
) {
    try {
        const { goalId } = await params;
        const cookieStore = await cookies();
        const userId = cookieStore.get("userId")?.value;

        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Verify the goal belongs to this user
        const goal = await db
            .select()
            .from(goals)
            .where(eq(goals.id, goalId))
            .limit(1);

        if (goal.length === 0) {
            return NextResponse.json(
                { error: "Goal not found" },
                { status: 404 }
            );
        }

        if (goal[0].userId !== userId) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 403 }
            );
        }

        // Fetch all steps for this goal
        const steps = await db
            .select()
            .from(goalSteps)
            .where(eq(goalSteps.goalId, goalId));

        // Fetch all resources for each step
        const resourcesByStep: ResourcesByStep = {};
        let totalSteps = steps.length;
        let stepsWithResources = 0;

        for (const step of steps) {
            const resources = await db
                .select({
                    id: goalResources.id,
                    title: goalResources.title,
                    url: goalResources.url,
                })
                .from(goalResources)
                .where(eq(goalResources.stepId, step.id));

            resourcesByStep[step.id] = resources;

            if (resources.length > 0) {
                stepsWithResources++;
            }
        }

        // allCurated is true when all steps have at least one resource
        const allCurated = totalSteps > 0 && stepsWithResources === totalSteps;

        return NextResponse.json({
            resources: resourcesByStep,
            allCurated,
            totalSteps,
            stepsWithResources,
        });
    } catch (error) {
        console.error("Error fetching goal resources:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
