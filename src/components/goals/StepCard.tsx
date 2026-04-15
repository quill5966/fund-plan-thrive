"use client";

import React, { useState } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { validateTaskDescription, validateStep } from "@/lib/validation";

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

interface StepCardProps {
    step: Step;
    status: StepStatus;
    expanded: boolean;
    onToggle: () => void;
    goalId: string;
    compact?: boolean;
    onStepUpdate: (stepId: string, description: string) => void;
    onStepDelete: (stepId: string) => void;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

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

const TrashIcon = () => (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3.5h10M5 3.5V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5v1M11.5 3.5l-.7 8a.5.5 0 01-.5.5H3.7a.5.5 0 01-.5-.5l-.7-8"/>
    </svg>
);

const PencilIcon = () => (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2l2 2-8 8H2v-2l8-8z"/>
    </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────

export default function StepCard({ step, status, expanded, onToggle, goalId, compact, onStepUpdate, onStepDelete }: StepCardProps) {
    const accentBorder = status === "active" ? "var(--accent-border)" : "var(--border)";

    // Task list — local state, seeded from props on mount
    const [tasks, setTasks] = useState<Task[]>(step.tasks);

    // Add-task input state
    const [isAddingTask, setIsAddingTask]   = useState(false);
    const [newTaskText, setNewTaskText]     = useState("");
    const [newTaskError, setNewTaskError]   = useState<string | undefined>();
    const [isSubmitting, setIsSubmitting]   = useState(false);

    // Edit-task state
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [editText, setEditText]           = useState("");
    const [editError, setEditError]         = useState<string | undefined>();
    const [isSavingEdit, setIsSavingEdit]   = useState(false);

    // Delete confirmation state (tasks)
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting]         = useState(false);

    // Step edit state
    const [isEditingStep, setIsEditingStep]     = useState(false);
    const [stepEditText, setStepEditText]       = useState(step.description);
    const [stepEditError, setStepEditError]     = useState<string | undefined>();
    const [isSavingStep, setIsSavingStep]       = useState(false);

    // Step delete confirmation state
    const [showStepDelete, setShowStepDelete]   = useState(false);
    const [isDeletingStep, setIsDeletingStep]   = useState(false);

    // Progress calculation
    const total     = tasks.length;
    const completed = tasks.filter(t => t.isCompleted).length;
    const pct       = total === 0 ? 0 : Math.round((completed / total) * 100);

    const basePath = `/api/goals/${goalId}/steps/${step.id}/tasks`;

    // ── Handlers ──────────────────────────────────────────────────────────────

    async function handleAddTask() {
        const validation = validateTaskDescription(newTaskText);
        if (!validation.valid) { setNewTaskError(validation.error); return; }

        setIsSubmitting(true);
        try {
            const res = await fetch(basePath, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ description: newTaskText }),
            });
            if (!res.ok) {
                const data = await res.json();
                setNewTaskError(data.error ?? "Failed to add task.");
                return;
            }
            const { task } = await res.json();
            setTasks(prev => [...prev, task]);
            setNewTaskText("");
            setIsAddingTask(false);
            setNewTaskError(undefined);
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleToggle(task: Task) {
        // Optimistic update
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, isCompleted: !t.isCompleted } : t));

        const res = await fetch(`${basePath}/${task.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ description: task.description, isCompleted: !task.isCompleted }),
        });

        if (!res.ok) {
            // Revert on error
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, isCompleted: task.isCompleted } : t));
        }
    }

    function startEdit(task: Task) {
        setEditingTaskId(task.id);
        setEditText(task.description);
        setEditError(undefined);
    }

    function cancelEdit() {
        setEditingTaskId(null);
        setEditText("");
        setEditError(undefined);
    }

    async function handleSaveEdit(task: Task) {
        const validation = validateTaskDescription(editText);
        if (!validation.valid) { setEditError(validation.error); return; }
        if (editText.trim() === task.description) { cancelEdit(); return; }

        setIsSavingEdit(true);
        try {
            const res = await fetch(`${basePath}/${task.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ description: editText, isCompleted: task.isCompleted }),
            });
            if (!res.ok) {
                const data = await res.json();
                setEditError(data.error ?? "Failed to save.");
                return;
            }
            const { task: updated } = await res.json();
            setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
            cancelEdit();
        } finally {
            setIsSavingEdit(false);
        }
    }

    async function handleDelete() {
        if (!deleteTargetId) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`${basePath}/${deleteTargetId}`, { method: "DELETE" });
            if (res.ok || res.status === 204) {
                setTasks(prev => prev.filter(t => t.id !== deleteTargetId));
            }
        } finally {
            setIsDeleting(false);
            setDeleteTargetId(null);
        }
    }

    // ── Step-level handlers ────────────────────────────────────────────────────

    function startStepEdit(e: React.MouseEvent) {
        e.stopPropagation();
        setIsEditingStep(true);
        setStepEditText(step.description);
        setStepEditError(undefined);
    }

    function cancelStepEdit() {
        setIsEditingStep(false);
        setStepEditText(step.description);
        setStepEditError(undefined);
    }

    async function handleStepSave() {
        const validation = validateStep(stepEditText);
        if (!validation.valid) { setStepEditError(validation.error); return; }
        if (stepEditText.trim() === step.description) { cancelStepEdit(); return; }

        setIsSavingStep(true);
        try {
            const res = await fetch(`/api/goals/${goalId}/steps/${step.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ description: stepEditText }),
            });
            if (!res.ok) {
                const data = await res.json();
                setStepEditError(data.error ?? "Failed to save.");
                return;
            }
            onStepUpdate(step.id, stepEditText.trim());
            cancelStepEdit();
        } finally {
            setIsSavingStep(false);
        }
    }

    async function handleStepDelete() {
        setIsDeletingStep(true);
        try {
            const res = await fetch(`/api/goals/${goalId}/steps/${step.id}`, { method: "DELETE" });
            if (res.ok || res.status === 204) {
                onStepDelete(step.id);
            }
        } finally {
            setIsDeletingStep(false);
            setShowStepDelete(false);
        }
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <>
            <ConfirmModal
                isOpen={deleteTargetId !== null}
                message="Delete this task? This cannot be undone."
                confirmLabel={isDeleting ? "Deleting…" : "Delete"}
                onConfirm={handleDelete}
                onCancel={() => setDeleteTargetId(null)}
            />

            <ConfirmModal
                isOpen={showStepDelete}
                message="Delete this step? All tasks and resources in this step will also be deleted. This cannot be undone."
                confirmLabel={isDeletingStep ? "Deleting…" : "Delete"}
                onConfirm={handleStepDelete}
                onCancel={() => setShowStepDelete(false)}
            />

            <div style={{
                flex: 1,
                background: "var(--bg-card)",
                border: `1px solid ${accentBorder}`,
                borderRadius: 10,
                overflow: "hidden",
            }}>
                {/* Header */}
                <div
                    onClick={isEditingStep ? undefined : onToggle}
                    style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: compact ? "8px 12px" : "10px 14px",
                        cursor: isEditingStep ? "default" : "pointer",
                    }}
                >
                    {isEditingStep ? (
                        /* Step edit mode */
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }} onClick={e => e.stopPropagation()}>
                            <Input
                                value={stepEditText}
                                onChange={(e) => { setStepEditText(e.target.value); setStepEditError(undefined); }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleStepSave();
                                    if (e.key === "Escape") cancelStepEdit();
                                }}
                                error={stepEditError}
                                maxLength={300}
                                autoFocus
                            />
                            <div style={{ display: "flex", gap: 6 }}>
                                <Button size="sm" onClick={handleStepSave} disabled={isSavingStep} loading={isSavingStep}>
                                    Save
                                </Button>
                                <Button size="sm" variant="ghost" onClick={cancelStepEdit}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    ) : (
                        /* Default header */
                        <>
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
                                    <span style={{ color: "var(--accent)", flexShrink: 0, opacity: 0.7 }} title="You added this">
                                        <PinIcon />
                                    </span>
                                )}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                                <StatusBadge status={status} />
                                {/* Edit step button */}
                                <button
                                    onClick={startStepEdit}
                                    title="Edit step"
                                    style={{
                                        background: "none", border: "none", padding: 3,
                                        color: "var(--text-ter)", cursor: "pointer",
                                        display: "flex", alignItems: "center",
                                        opacity: 0.5, transition: "opacity 0.15s",
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                                    onMouseLeave={e => (e.currentTarget.style.opacity = "0.5")}
                                >
                                    <PencilIcon />
                                </button>
                                {/* Delete step button */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowStepDelete(true); }}
                                    title="Delete step"
                                    style={{
                                        background: "none", border: "none", padding: 3,
                                        color: "var(--text-ter)", cursor: "pointer",
                                        display: "flex", alignItems: "center",
                                        opacity: 0.5, transition: "opacity 0.15s",
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                                    onMouseLeave={e => (e.currentTarget.style.opacity = "0.5")}
                                >
                                    <TrashIcon />
                                </button>
                                <span style={{
                                    color: "var(--text-ter)",
                                    display: "flex",
                                    transform: expanded ? "rotate(180deg)" : "none",
                                    transition: "transform 0.2s",
                                }}>
                                    <ChevDownIcon />
                                </span>
                            </div>
                        </>
                    )}
                </div>

                {/* Expanded body */}
                {expanded && (
                    <div style={{
                        borderTop: "1px solid var(--border)",
                        padding: compact ? "10px 12px" : "12px 14px",
                        display: "flex", flexDirection: "column", gap: 12,
                    }}>
                        {/* Tasks section */}
                        <div>
                            {/* Section header */}
                            <div style={{
                                fontSize: 10, color: "var(--text-ter)",
                                textTransform: "uppercase", letterSpacing: "0.05em",
                                marginBottom: 8, fontWeight: 600,
                            }}>Tasks</div>

                            {/* Progress bar — always visible */}
                            <div style={{ marginBottom: 8 }}>
                                <ProgressBar percentage={pct} />
                                <div style={{
                                    fontSize: 10, color: "var(--text-ter)",
                                    marginTop: 3,
                                }}>
                                    {pct}% complete · {completed}/{total} tasks
                                </div>
                            </div>

                            {/* Task rows */}
                            {tasks.map((task) => (
                                <div key={task.id} style={{
                                    borderBottom: "1px solid var(--border)",
                                    paddingBottom: 6, marginBottom: 6,
                                }}>
                                    {editingTaskId === task.id ? (
                                        /* Edit mode */
                                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                            <Input
                                                value={editText}
                                                onChange={(e) => { setEditText(e.target.value); setEditError(undefined); }}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") handleSaveEdit(task);
                                                    if (e.key === "Escape") cancelEdit();
                                                }}
                                                error={editError}
                                                maxLength={300}
                                                autoFocus
                                            />
                                            <div style={{ display: "flex", gap: 6 }}>
                                                <Button size="sm" onClick={() => handleSaveEdit(task)} disabled={isSavingEdit} loading={isSavingEdit}>
                                                    Save
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={cancelEdit}>
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        /* Default row */
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
                                            {/* Checkbox */}
                                            <div
                                                onClick={() => handleToggle(task)}
                                                style={{
                                                    width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                                                    border: task.isCompleted ? "none" : "1.5px solid var(--border-light)",
                                                    background: task.isCompleted ? "var(--accent)" : "transparent",
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                    cursor: "pointer", transition: "background 0.15s",
                                                }}
                                            >
                                                {task.isCompleted && <CheckIcon />}
                                            </div>

                                            {/* Description — click to edit */}
                                            <span
                                                onClick={() => startEdit(task)}
                                                title="Click to edit"
                                                style={{
                                                    flex: 1,
                                                    fontSize: compact ? 11 : 12,
                                                    color: task.isCompleted ? "var(--text-ter)" : "var(--text-sec)",
                                                    textDecoration: task.isCompleted ? "line-through" : "none",
                                                    cursor: "text",
                                                    wordBreak: "break-word",
                                                }}
                                            >
                                                {task.description}
                                            </span>

                                            {/* Trash button */}
                                            <button
                                                onClick={() => setDeleteTargetId(task.id)}
                                                title="Delete task"
                                                style={{
                                                    background: "none", border: "none", padding: 2,
                                                    color: "var(--text-ter)", cursor: "pointer", flexShrink: 0,
                                                    display: "flex", alignItems: "center",
                                                    opacity: 0.6, transition: "opacity 0.15s",
                                                }}
                                                onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                                                onMouseLeave={e => (e.currentTarget.style.opacity = "0.6")}
                                            >
                                                <TrashIcon />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Add Task */}
                            {isAddingTask ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                                    <Input
                                        value={newTaskText}
                                        onChange={(e) => { setNewTaskText(e.target.value); setNewTaskError(undefined); }}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") handleAddTask();
                                            if (e.key === "Escape") { setIsAddingTask(false); setNewTaskText(""); setNewTaskError(undefined); }
                                        }}
                                        placeholder="Add a task"
                                        error={newTaskError}
                                        maxLength={300}
                                        autoFocus
                                    />
                                    <div style={{ display: "flex", gap: 6 }}>
                                        <Button size="sm" onClick={handleAddTask} disabled={isSubmitting} loading={isSubmitting}>
                                            Add
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => { setIsAddingTask(false); setNewTaskText(""); setNewTaskError(undefined); }}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsAddingTask(true)}
                                    style={{
                                        display: "flex", alignItems: "center", gap: 5,
                                        marginTop: tasks.length > 0 ? 4 : 0,
                                        padding: "5px 12px", borderRadius: 6,
                                        border: "1px solid var(--border)",
                                        background: "var(--bg-surface)",
                                        color: "var(--text-sec)", fontSize: 12,
                                        cursor: "pointer", width: "fit-content",
                                    }}
                                >
                                    + Add task
                                </button>
                            )}
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
        </>
    );
}
