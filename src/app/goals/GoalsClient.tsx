"use client";

import React, { useMemo } from "react";
import GoalCard from "@/components/goals/GoalCard";
import { usePollingResources } from "@/hooks/usePollingResources";

// Goal types matching what financeService.getGoals returns
interface Resource {
    id: string;
    title: string;
    url: string;
}

interface Step {
    id: string;
    description: string;
    order: string;
    isCompleted: boolean;
    isUserDefined: boolean;
    resources: Resource[];
}

interface Goal {
    id: string;
    title: string;
    targetAmount: string | null;
    currentAmount: string | null;
    steps: Step[];
    status: string;
}

interface GoalsClientProps {
    goals: Goal[];
}

// Wrapper component that handles polling for a single goal
function GoalWithPolling({ goal }: { goal: Goal }) {
    // Check if any steps are missing resources
    const hasEmptyResources = goal.steps.some(step => step.resources.length === 0);

    // Only poll if there are empty resources (uses hook's default 10s interval)
    const { resources: polledResources, isPolling } = usePollingResources(
        goal.id,
        undefined,  // Use hook's default interval
        hasEmptyResources
    );

    // Merge polled resources into the goal
    const mergedGoal = useMemo(() => {
        if (Object.keys(polledResources).length === 0) {
            return goal;
        }

        const mergedSteps = goal.steps.map(step => {
            const polledForStep = polledResources[step.id];
            if (polledForStep && polledForStep.length > 0) {
                return { ...step, resources: polledForStep };
            }
            return step;
        });

        return { ...goal, steps: mergedSteps };
    }, [goal, polledResources]);

    return <GoalCard goal={mergedGoal} />;
}

export default function GoalsClient({ goals }: GoalsClientProps) {
    return (
        <div className="max-w-7xl mx-auto px-8 py-8">
            <header className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Goals</h1>
                <p className="text-gray-500 mt-1">Track your financial goals and progress</p>
            </header>

            <div className="space-y-6">
                {goals.length > 0 ? (
                    goals.map((goal) => (
                        <GoalWithPolling key={goal.id} goal={goal} />
                    ))
                ) : (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm shadow-gray-900/5 p-8 text-center">
                        <div className="text-4xl mb-4">🎯</div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Goals Yet</h3>
                        <p className="text-gray-500 max-w-md mx-auto">
                            Start a conversation in Chat to set up your financial goals.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
