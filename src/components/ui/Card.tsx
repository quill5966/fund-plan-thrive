"use client";

import React from "react";

interface CardProps {
    title?: string;
    children: React.ReactNode;
    className?: string;
}

export function Card({ title, children, className = "" }: CardProps) {
    return (
        <div
            className={`
        bg-white
        border border-gray-100
        rounded-xl
        shadow-sm shadow-gray-900/5
        ${className}
      `}
        >
            {title && (
                <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                        {title}
                    </h2>
                </div>
            )}
            <div className="p-6">{children}</div>
        </div>
    );
}
