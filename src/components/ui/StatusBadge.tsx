"use client";

import React from "react";

export type BadgeStatus = "done" | "active" | "pending";

interface StatusBadgeProps {
    status: BadgeStatus;
}

const CONFIG: Record<BadgeStatus, { bg: string; color: string; label: string }> = {
    done: { bg: "var(--green-dim)", color: "var(--green)", label: "Done" },
    active: { bg: "var(--accent-dim)", color: "var(--accent)", label: "Active" },
    pending: { bg: "var(--bg-surface)", color: "var(--text-ter)", label: "Pending" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
    const c = CONFIG[status] || CONFIG.pending;
    return (
        <span
            className="text-[10px] font-medium inline-block"
            style={{
                padding: "2px 8px",
                borderRadius: 12,
                background: c.bg,
                color: c.color,
            }}
        >
            {c.label}
        </span>
    );
}
