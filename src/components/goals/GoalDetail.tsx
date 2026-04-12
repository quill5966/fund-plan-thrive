import React from "react";
import StepTimeline from "./StepTimeline";

interface Resource {
    id: string;
    title: string;
    url: string;
}

interface Task {
    id: string;
    description: string;
    isCompleted: boolean;
    sortOrder: number;
}

interface Step {
    id: string;
    description: string;
    order: string;
    isCompleted: boolean;
    isUserDefined: boolean;
    resources: Resource[];
    tasks: Task[];
}

interface Goal {
    id: string;
    title: string;
    targetAmount: string | null;
    currentAmount: string | null;
    steps: Step[];
    status: string;
}

interface GoalDetailProps {
    goal: Goal;
}

export default function GoalDetail({ goal }: GoalDetailProps) {
    const target = parseFloat(goal.targetAmount || "0");
    const current = parseFloat(goal.currentAmount || "0");
    const hasTarget = target > 0;
    const progressPct = hasTarget ? Math.min(Math.round((current / target) * 100), 100) : 0;
    const leftToSave = Math.max(0, target - current);

    return (
        <div style={{ flex: 1, overflow: "auto", padding: "24px 28px" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <h2 style={{
                    fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em",
                    flex: 1, color: "var(--text)", margin: 0,
                }}>
                    {goal.title}
                </h2>
                {/* Decorative edit button */}
                <button style={{
                    padding: "5px 12px", borderRadius: 6,
                    border: "1px solid var(--border)",
                    background: "var(--bg-surface)",
                    color: "var(--text-sec)", fontSize: 12, cursor: "pointer",
                }}>Edit</button>
            </div>

            {/* Financial target card */}
            <div style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "14px 18px",
                marginBottom: 20,
                display: "flex", alignItems: "center", gap: 16,
            }}>
                {hasTarget ? (
                    <>
                        <div style={{ flex: 1 }}>
                            <div style={{
                                fontSize: 11, color: "var(--text-ter)",
                                fontWeight: 500, marginBottom: 4,
                            }}>Financial target</div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>
                                ${current.toLocaleString()}
                            </div>
                            <div style={{ fontSize: 12, color: "var(--text-sec)", marginTop: 2 }}>
                                of ${target.toLocaleString()}
                            </div>
                        </div>
                        <div style={{ width: 160 }}>
                            <div style={{
                                height: 6, background: "var(--bg-surface)",
                                borderRadius: 3, overflow: "hidden",
                            }}>
                                <div style={{
                                    width: `${progressPct}%`, height: "100%",
                                    background: "var(--green)", borderRadius: 3,
                                    transition: "width 0.3s ease",
                                }}/>
                            </div>
                            <div style={{
                                fontSize: 11, color: "var(--text-sec)",
                                marginTop: 4, textAlign: "right",
                            }}>
                                ${leftToSave.toLocaleString()} left
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, color: "var(--text-ter)", fontWeight: 500 }}>Financial target</div>
                            <div style={{ fontSize: 13, color: "var(--text-ter)", marginTop: 4 }}>
                                No financial target for this goal
                            </div>
                        </div>
                        {/* Decorative add target button */}
                        <button style={{
                            padding: "5px 12px", borderRadius: 6,
                            border: "1px solid var(--border)",
                            background: "var(--bg-surface)",
                            color: "var(--text-sec)", fontSize: 12, cursor: "pointer",
                        }}>+ Add target</button>
                    </>
                )}
            </div>

            {/* Steps section header */}
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 12,
            }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Steps</div>
                {/* Decorative add step button */}
                <button style={{
                    padding: "5px 12px", borderRadius: 6,
                    border: "1px solid var(--border)",
                    background: "var(--bg-surface)",
                    color: "var(--text-sec)", fontSize: 12, cursor: "pointer",
                }}>+ Add step</button>
            </div>

            {goal.steps.length > 0 ? (
                <StepTimeline steps={goal.steps} goalId={goal.id} />
            ) : (
                <div style={{
                    padding: "32px 0", textAlign: "center",
                    color: "var(--text-ter)", fontSize: 13,
                }}>
                    No steps yet. Ask your advisor to create a plan.
                </div>
            )}
        </div>
    );
}
