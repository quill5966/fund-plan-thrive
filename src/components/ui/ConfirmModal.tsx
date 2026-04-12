"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";

interface ConfirmModalProps {
    isOpen: boolean;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmModal({
    isOpen,
    message,
    confirmLabel = "Delete",
    onConfirm,
    onCancel,
}: ConfirmModalProps) {
    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    return createPortal(
        <div
            onClick={onCancel}
            style={{
                position: "fixed", inset: 0, zIndex: 1000,
                background: "rgba(0,0,0,0.6)",
                display: "flex", alignItems: "center", justifyContent: "center",
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: "24px 28px",
                    maxWidth: 360,
                    width: "90%",
                    display: "flex", flexDirection: "column", gap: 20,
                }}
            >
                <p style={{ margin: 0, fontSize: 14, color: "var(--text)", lineHeight: 1.5 }}>
                    {message}
                </p>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <Button variant="ghost" size="sm" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button
                        size="sm"
                        onClick={onConfirm}
                        style={{ background: "var(--red)", color: "#fff" }}
                    >
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
}
