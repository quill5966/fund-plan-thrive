"use client";

import React, { ReactNode } from "react";

interface TabItemProps {
    icon: ReactNode;
    label: string;
    active: boolean;
    disabled?: boolean;
    onClick?: () => void;
    badge?: boolean;
}

export default function TabItem({ icon, label, active, disabled, onClick, badge }: TabItemProps) {
    return (
        <button
            onClick={disabled ? undefined : onClick}
            className="flex-1 flex flex-col items-center justify-center gap-1 relative transition-colors duration-150"
            style={{
                border: "none",
                background: "transparent",
                cursor: disabled ? "not-allowed" : "pointer",
                color: disabled ? "rgba(92,97,120,0.33)" : active ? "var(--accent)" : "var(--text-ter)",
                opacity: disabled ? 0.4 : 1,
            }}
        >
            {/* Active indicator bar */}
            {active && !disabled && (
                <div
                    className="absolute top-0"
                    style={{
                        left: "25%",
                        right: "25%",
                        height: 2,
                        background: "var(--accent)",
                        borderRadius: "0 0 2px 2px",
                    }}
                />
            )}
            <div className="relative">
                {icon}
                {badge && !disabled && (
                    <div
                        className="absolute"
                        style={{
                            top: -2,
                            right: -4,
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: "var(--accent)",
                            boxShadow: "0 0 6px var(--accent)",
                        }}
                    />
                )}
            </div>
            <span
                className="text-[10px]"
                style={{
                    fontWeight: active && !disabled ? 600 : 400,
                    letterSpacing: "0.02em",
                }}
            >
                {label}
            </span>
        </button>
    );
}
