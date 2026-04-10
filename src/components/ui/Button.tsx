"use client";

import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "gradient" | "ghost";
    size?: "sm" | "md" | "lg";
    loading?: boolean;
    children: React.ReactNode;
}

export function Button({
    variant = "primary",
    size = "md",
    loading = false,
    disabled,
    children,
    className = "",
    style,
    ...props
}: ButtonProps) {
    const sizes = {
        sm: "px-3 py-1.5 text-xs rounded-lg",
        md: "px-6 py-3 text-sm rounded-lg",
        lg: "px-8 py-3.5 text-base rounded-xl",
    };

    const baseStyles =
        "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
        primary:
            "text-white hover:brightness-110 shadow-md",
        secondary:
            "hover:brightness-110",
        gradient:
            "text-white hover:brightness-110 shadow-md",
        ghost:
            "hover:brightness-110",
    };

    const variantStyles: Record<string, React.CSSProperties> = {
        primary: { background: "var(--accent)" },
        secondary: { background: "var(--bg-surface)", color: "var(--text)" },
        gradient: { background: "linear-gradient(135deg, var(--accent), #8b5cf6)" },
        ghost: { background: "transparent", color: "var(--text-sec)", border: "1px solid var(--border)" },
    };

    return (
        <button
            className={`${baseStyles} ${sizes[size]} ${variants[variant]} ${className}`}
            disabled={disabled || loading}
            style={{ ...variantStyles[variant], ...style }}
            {...props}
        >
            {loading && (
                <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                >
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                    />
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                </svg>
            )}
            {children}
        </button>
    );
}
