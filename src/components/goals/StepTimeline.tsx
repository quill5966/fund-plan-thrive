"use client";

import React, { useState } from "react";
import StepDot from "./StepDot";
import StepCard from "./StepCard";

type StepStatus = "done" | "active" | "pending";

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

interface StepTimelineProps {
    steps: Step[];
    goalId: string;
    onStepUpdate: (stepId: string, description: string) => void;
    onStepDelete: (stepId: string) => void;
}

function deriveStatus(steps: Step[], index: number): StepStatus {
    if (steps[index].isCompleted) return "done";
    // First incomplete step is "active"
    const firstIncompleteIndex = steps.findIndex(s => !s.isCompleted);
    if (index === firstIncompleteIndex) return "active";
    return "pending";
}

export default function StepTimeline({ steps, goalId, onStepUpdate, onStepDelete }: StepTimelineProps) {
    const sorted = [...steps].sort((a, b) => Number(a.order) - Number(b.order));

    // Auto-expand the active step
    const activeIndex = sorted.findIndex(s => !s.isCompleted);
    const initialExpanded: Record<string, boolean> = {};
    if (activeIndex !== -1) {
        initialExpanded[sorted[activeIndex].id] = true;
    }

    const [expanded, setExpanded] = useState<Record<string, boolean>>(initialExpanded);

    const toggle = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {sorted.map((step, i) => {
                const status = deriveStatus(sorted, i);
                const isExpanded = expanded[step.id] ?? false;
                const isLast = i === sorted.length - 1;

                return (
                    <div key={step.id} style={{ display: "flex", gap: 0, marginBottom: 8 }}>
                        {/* Timeline track */}
                        <div style={{
                            display: "flex", flexDirection: "column", alignItems: "center",
                            width: 36, paddingTop: 14, flexShrink: 0,
                        }}>
                            <StepDot status={status} number={i + 1} />
                            {!isLast && (
                                <div style={{
                                    width: 2, flex: 1, marginTop: 4, minHeight: 20,
                                    background: status === "done" ? "var(--green-border)" : "var(--border)",
                                    borderRadius: 1,
                                }}/>
                            )}
                        </div>

                        {/* Step card */}
                        <StepCard
                            step={step}
                            status={status}
                            expanded={isExpanded}
                            onToggle={() => toggle(step.id)}
                            goalId={goalId}
                            onStepUpdate={onStepUpdate}
                            onStepDelete={onStepDelete}
                        />
                    </div>
                );
            })}
        </div>
    );
}
