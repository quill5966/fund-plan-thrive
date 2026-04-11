"use client";

import React from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";

type StepStatus = "done" | "active" | "pending";

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

interface StepCardProps {
    step: Step;
    status: StepStatus;
    expanded: boolean;
    onToggle: () => void;
    compact?: boolean;
}

// Generic placeholder tasks per step — non-functional checkboxes
const PLACEHOLDER_TASKS = [
    "Research best approaches and options",
    "Compare top alternatives and trade-offs",
    "Create an action timeline",
];

const ChevDownIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3.5 5.25L7 8.75l3.5-3.5"/>
    </svg>
);

const PinIcon = () => (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor">
        <path d="M7.3 1.3a1 1 0 011.4 0l2 2a1 1 0 010 1.4L8.5 7l-.5 3.5L4.5 7 1.3 9.2a.5.5 0 01-.7-.7L3.5 5.5.5 2l3.5-.5z"/>
    </svg>
);

const SparkleIcon = () => (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 1v3M7 10v3M1 7h3M10 7h3M2.8 2.8l2.1 2.1M9.1 9.1l2.1 2.1M11.2 2.8l-2.1 2.1M4.9 9.1l-2.1 2.1"/>
    </svg>
);

const LinkIcon = () => (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 7l2-2"/>
        <path d="M7.5 3.5a2 2 0 012.83 2.83l-1.5 1.5"/>
        <path d="M4.5 8.5a2 2 0 01-2.83-2.83l1.5-1.5"/>
    </svg>
);

const CheckIcon = () => (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.5 6l2.5 2.5 4.5-5"/>
    </svg>
);

export default function StepCard({ step, status, expanded, onToggle, compact }: StepCardProps) {
    const accentBorder = status === "active" ? "var(--accent-border)" : "var(--border)";

    return (
        <div style={{
            flex: 1,
            background: "var(--bg-card)",
            border: `1px solid ${accentBorder}`,
            borderRadius: 10,
            overflow: "hidden",
        }}>
            {/* Header */}
            <div
                onClick={onToggle}
                style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: compact ? "8px 12px" : "10px 14px",
                    cursor: "pointer",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                    <span style={{
                        fontSize: compact ? 12 : 13,
                        fontWeight: 500,
                        color: status === "done" ? "var(--text-ter)" : "var(--text)",
                        textDecoration: status === "done" ? "line-through" : "none",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                        {step.description}
                    </span>
                    {step.isUserDefined && (
                        <span style={{ color: "var(--accent)", flexShrink: 0, opacity: 0.7 }} title="You mentioned this">
                            <PinIcon />
                        </span>
                    )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <StatusBadge status={status} />
                    <span style={{
                        color: "var(--text-ter)",
                        display: "flex",
                        transform: expanded ? "rotate(180deg)" : "none",
                        transition: "transform 0.2s",
                    }}>
                        <ChevDownIcon />
                    </span>
                </div>
            </div>

            {/* Expanded body */}
            {expanded && (
                <div style={{
                    borderTop: "1px solid var(--border)",
                    padding: compact ? "10px 12px" : "12px 14px",
                    display: "flex", flexDirection: "column", gap: 12,
                }}>
                    {/* Placeholder tasks */}
                    <div>
                        <div style={{
                            fontSize: 10, color: "var(--text-ter)",
                            textTransform: "uppercase", letterSpacing: "0.05em",
                            marginBottom: 8, fontWeight: 600,
                        }}>Tasks</div>
                        {PLACEHOLDER_TASKS.map((task, i) => (
                            <div key={i} style={{
                                display: "flex", alignItems: "center", gap: 8,
                                padding: "5px 0",
                                borderBottom: i < PLACEHOLDER_TASKS.length - 1 ? "1px solid var(--border)" : "none",
                            }}>
                                <div style={{
                                    width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                                    border: "1.5px solid var(--border-light)",
                                    background: "transparent",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    cursor: "default",
                                }}/>
                                <span style={{ fontSize: compact ? 11 : 12, color: "var(--text-sec)" }}>{task}</span>
                            </div>
                        ))}
                    </div>

                    {/* Resources */}
                    {step.resources.length > 0 ? (
                        <div>
                            <div style={{
                                fontSize: 10, color: "var(--accent)",
                                display: "flex", alignItems: "center", gap: 4,
                                marginBottom: 6,
                            }}>
                                <SparkleIcon />
                                {step.resources.length} resource{step.resources.length !== 1 ? "s" : ""} from your advisor
                            </div>
                            <div style={{
                                background: "var(--bg-surface)",
                                borderRadius: 8, padding: "8px 10px",
                                display: "flex", flexDirection: "column", gap: 5,
                            }}>
                                {step.resources.map((r) => (
                                    <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <span style={{ color: "var(--accent)", flexShrink: 0 }}><LinkIcon /></span>
                                        <a
                                            href={r.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ fontSize: 12, color: "var(--blue)", textDecoration: "none" }}
                                        >
                                            {r.title}
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div style={{
                                fontSize: 10, color: "var(--text-ter)",
                                display: "flex", alignItems: "center", gap: 4,
                                marginBottom: 6,
                            }}>
                                <SparkleIcon />
                                Curating resources for this step…
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
