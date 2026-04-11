"use client";

import React, { useState, useMemo } from "react";
import GoalSidebar from "@/components/goals/GoalSidebar";
import GoalDetail from "@/components/goals/GoalDetail";
import { usePollingResources } from "@/hooks/usePollingResources";

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

// Merges polled resources into a goal's steps
function useGoalWithPolling(goal: Goal) {
    const hasEmptyResources = goal.steps.some(step => step.resources.length === 0);
    const { resources: polledResources } = usePollingResources(
        goal.id,
        undefined,
        hasEmptyResources
    );

    return useMemo(() => {
        if (Object.keys(polledResources).length === 0) return goal;
        return {
            ...goal,
            steps: goal.steps.map(step => {
                const polled = polledResources[step.id];
                return polled && polled.length > 0 ? { ...step, resources: polled } : step;
            }),
        };
    }, [goal, polledResources]);
}

// Wrapper that handles polling for a single goal, then renders GoalDetail
function GoalDetailWithPolling({ goal }: { goal: Goal }) {
    const mergedGoal = useGoalWithPolling(goal);
    return <GoalDetail goal={mergedGoal} />;
}

export default function GoalsClient({ goals }: GoalsClientProps) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const selectedGoal = goals[selectedIndex] ?? null;

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 64px)" }}>
            {/* Top bar */}
            <div style={{
                padding: "16px 28px",
                display: "flex", alignItems: "center", gap: 10,
                borderBottom: "1px solid var(--border)", flexShrink: 0,
            }}>
                <div style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: "linear-gradient(135deg, var(--accent), #8b5cf6)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
                }}>💰</div>
                <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--text)" }}>
                    Goals
                </span>
            </div>

            {goals.length === 0 ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--border)",
                        borderRadius: 16, padding: 48,
                        textAlign: "center", maxWidth: 400,
                    }}>
                        <div style={{ fontSize: 40, marginBottom: 16 }}>🎯</div>
                        <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>No Goals Yet</h3>
                        <p style={{ fontSize: 13, color: "var(--text-sec)", lineHeight: 1.6 }}>
                            Start a conversation with your advisor to set up your financial goals.
                        </p>
                    </div>
                </div>
            ) : (
                <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
                    <GoalSidebar
                        goals={goals}
                        selectedIndex={selectedIndex}
                        onSelect={setSelectedIndex}
                    />
                    {selectedGoal && (
                        <GoalDetailWithPolling key={selectedGoal.id} goal={selectedGoal} />
                    )}
                </div>
            )}
        </div>
    );
}
