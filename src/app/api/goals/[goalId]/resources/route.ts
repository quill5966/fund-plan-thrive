import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { goals, goalSteps, goalResources } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/session";

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
 * Identity is resolved from the iron-session cookie.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ goalId: string }> }
) {
    try {
        const { goalId } = await params;
        const session = await getSession();
        const userId = session.isAuthenticated ? session.userId : undefined;

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
        let stepsWithResources = 0;
        // Only steps that went through the curation pipeline (intentExtractedAt is set)
        // are expected to have resources. Manually added steps skip curation.
        let stepsPendingCuration = 0;

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
            } else if (step.intentExtractedAt) {
                // Intent was extracted but no resources yet — curation is in progress
                stepsPendingCuration++;
            }
            // Steps without intentExtractedAt AND without resources were manually
            // added — curation was never triggered, so they're not "pending"
        }

        // allCurated is true when no steps are waiting for curation results
        const allCurated = stepsPendingCuration === 0;

        return NextResponse.json({
            resources: resourcesByStep,
            allCurated,
            totalSteps: steps.length,
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
