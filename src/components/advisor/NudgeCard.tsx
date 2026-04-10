"use client";

import React from "react";
import { Sparkles } from "lucide-react";

interface NudgeCardProps {
    text: string;
    actions: string[];
    onDismiss: () => void;
}

export default function NudgeCard({ text, actions, onDismiss }: NudgeCardProps) {
    return (
        <div
            className="mx-3 mt-3 rounded-[10px]"
            style={{
                padding: "12px 14px",
                background: "linear-gradient(135deg, var(--accent-dim), rgba(139,92,246,0.08))",
                border: "1px solid var(--accent-border)",
            }}
        >
            <div
                className="flex items-center gap-1 text-[10px] font-semibold uppercase mb-1.5"
                style={{ letterSpacing: "0.04em", color: "var(--accent)" }}
            >
                <Sparkles size={12} />
                Suggestion
            </div>
            <div
                className="text-[13px] leading-relaxed mb-2.5"
                style={{ color: "var(--text)" }}
            >
                {text}
            </div>
            <div className="flex gap-1.5">
                {actions.map((a, i) => (
                    <button
                        key={i}
                        onClick={onDismiss}
                        className="text-xs font-medium cursor-pointer transition-opacity hover:opacity-80"
                        style={{
                            padding: "6px 12px",
                            borderRadius: 8,
                            border: i === 0 ? "none" : "1px solid var(--border)",
                            background: i === 0 ? "var(--accent)" : "transparent",
                            color: i === 0 ? "#fff" : "var(--text-sec)",
                        }}
                    >
                        {a}
                    </button>
                ))}
            </div>
        </div>
    );
}
