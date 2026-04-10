"use client";

import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export function Input({
    label,
    error,
    className = "",
    id,
    ...props
}: InputProps) {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
        <div className="flex flex-col gap-1.5">
            {label && (
                <label
                    htmlFor={inputId}
                    className="text-sm font-medium"
                    style={{ color: "var(--text-sec)" }}
                >
                    {label}
                </label>
            )}
            <input
                id={inputId}
                className={`
                    w-full px-4 py-3 rounded-xl
                    transition-all duration-200
                    outline-none
                    ${className}
                `}
                style={{
                    background: "var(--bg-surface)",
                    border: `1px solid ${error ? "var(--red)" : "var(--border)"}`,
                    color: "var(--text)",
                }}
                {...props}
            />
            {error && <p className="text-sm" style={{ color: "var(--red)" }}>{error}</p>}
        </div>
    );
}
