"use client";

import React from "react";

interface ProgressBarProps {
    percentage: number;
    color?: string;
    height?: number;
    className?: string;
}

export function ProgressBar({
    percentage,
    color = "var(--accent)",
    height = 4,
    className = "",
}: ProgressBarProps) {
    return (
        <div
            className={`w-full overflow-hidden ${className}`}
            style={{
                height,
                background: "var(--bg-surface)",
                borderRadius: height / 2,
            }}
        >
            <div
                className="h-full transition-all duration-300"
                style={{
                    width: `${Math.min(100, Math.max(0, percentage))}%`,
                    background: color,
                    borderRadius: height / 2,
                }}
            />
        </div>
    );
}
