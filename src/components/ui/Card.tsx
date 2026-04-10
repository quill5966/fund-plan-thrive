"use client";

import React from "react";

interface CardProps {
    title?: string;
    children: React.ReactNode;
    className?: string;
    variant?: "default" | "surface" | "transparent";
}

export function Card({ title, children, className = "", variant = "default" }: CardProps) {
    const variantStyles: Record<string, React.CSSProperties> = {
        default: { background: "var(--bg-card)", border: "1px solid var(--border)" },
        surface: { background: "var(--bg-surface)", border: "1px solid var(--border)" },
        transparent: { background: "transparent", border: "1px solid transparent" },
    };

    return (
        <div
            className={`rounded-xl shadow-sm ${className}`}
            style={variantStyles[variant]}
        >
            {title && (
                <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)" }}>
                    <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
                        {title}
                    </h2>
                </div>
            )}
            <div className="p-6">{children}</div>
        </div>
    );
}
