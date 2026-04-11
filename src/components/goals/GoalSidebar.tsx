import React from "react";

interface Goal {
    id: string;
    title: string;
    targetAmount: string | null;
    currentAmount: string | null;
    steps: { isCompleted: boolean }[];
    status: string;
}

interface GoalSidebarProps {
    goals: Goal[];
    selectedIndex: number;
    onSelect: (index: number) => void;
}

const PlusIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M7 2v10M2 7h10"/>
    </svg>
);

function goalProgress(goal: Goal): number {
    const target = parseFloat(goal.targetAmount || "0");
    const current = parseFloat(goal.currentAmount || "0");
    if (target > 0) return Math.min(Math.round((current / target) * 100), 100);
    const total = goal.steps.length;
    if (total === 0) return 0;
    return Math.round((goal.steps.filter(s => s.isCompleted).length / total) * 100);
}

export default function GoalSidebar({ goals, selectedIndex, onSelect }: GoalSidebarProps) {
    return (
        <div style={{
            width: 220, borderRight: "1px solid var(--border)",
            padding: "16px 12px",
            display: "flex", flexDirection: "column", gap: 6,
            flexShrink: 0, background: "var(--bg-card)", overflow: "auto",
        }}>
            <div style={{
                fontSize: 10, color: "var(--text-ter)",
                textTransform: "uppercase", letterSpacing: "0.06em",
                padding: "0 8px", marginBottom: 4, fontWeight: 600,
            }}>
                Your goals
            </div>

            {goals.map((goal, i) => {
                const progress = goalProgress(goal);
                const isSelected = i === selectedIndex;
                return (
                    <button
                        key={goal.id}
                        onClick={() => onSelect(i)}
                        style={{
                            padding: "10px 12px", borderRadius: 8,
                            border: `1px solid ${isSelected ? "var(--accent-border)" : "var(--border)"}`,
                            background: isSelected ? "var(--accent-dim)" : "var(--bg-surface)",
                            cursor: "pointer", textAlign: "left",
                            display: "flex", flexDirection: "column", gap: 6,
                        }}
                    >
                        <div style={{
                            fontSize: 13, fontWeight: 500,
                            color: isSelected ? "var(--accent)" : "var(--text)",
                        }}>
                            {goal.title}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                            <div style={{
                                flex: 1, height: 3,
                                background: "var(--border)", borderRadius: 2, overflow: "hidden",
                            }}>
                                <div style={{
                                    width: `${progress}%`, height: "100%",
                                    background: isSelected ? "var(--accent)" : "var(--text-ter)",
                                    borderRadius: 2,
                                }}/>
                            </div>
                            <span style={{ fontSize: 11, color: "var(--text-ter)" }}>{progress}%</span>
                        </div>
                    </button>
                );
            })}

            {/* Decorative "Add a goal" button */}
            <button style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 12px", borderRadius: 8,
                border: "1px dashed var(--border)",
                background: "transparent", color: "var(--text-ter)",
                fontSize: 13, cursor: "pointer", marginTop: 4,
            }}>
                <PlusIcon /> Add a goal
            </button>
        </div>
    );
}
