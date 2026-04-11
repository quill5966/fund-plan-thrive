import React from "react";

type StepStatus = "done" | "active" | "pending";

interface StepDotProps {
    status: StepStatus;
    number: number;
}

export default function StepDot({ status, number }: StepDotProps) {
    const bg =
        status === "done" ? "var(--green)" :
        status === "active" ? "var(--accent)" :
        "var(--bg-surface)";
    const border =
        status === "done" ? "var(--green)" :
        status === "active" ? "var(--accent)" :
        "var(--border)";
    const color = status === "done" || status === "active" ? "#fff" : "var(--text-ter)";

    return (
        <div style={{
            width: 22, height: 22, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: bg, border: `2px solid ${border}`,
            color, fontSize: 10, fontWeight: 600, flexShrink: 0,
        }}>
            {status === "done" ? "✓" : number}
        </div>
    );
}
