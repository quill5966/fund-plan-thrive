import React from "react";
import { financeService } from "@/services/finance";
import { userService } from "@/services/user";
import Link from "next/link";
import GoalsClient from "./GoalsClient";
import { getSession } from "@/lib/session";

export const dynamic = 'force-dynamic';

export default async function GoalsPage() {
    const session = await getSession();
    const userId = session.isAuthenticated ? session.userId : undefined;

    if (!userId) {
        return (
            <div style={{ maxWidth: 960, margin: "0 auto", padding: "80px 32px", textAlign: "center" }}>
                <div style={{
                    background: "var(--bg-card)", border: "1px solid var(--border)",
                    borderRadius: 16, padding: 48, maxWidth: 480, margin: "0 auto",
                }}>
                    <div style={{ fontSize: 48, marginBottom: 20 }}>🔒</div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>No Active Session</h2>
                    <p style={{ color: "var(--text-sec)", marginBottom: 28, lineHeight: 1.6 }}>
                        Please go to the Chat page and start a conversation with the AI advisor to set up your goals.
                    </p>
                    <Link href="/" style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        padding: "10px 24px", borderRadius: 10,
                        background: "linear-gradient(135deg, var(--accent), #8b5cf6)",
                        color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none",
                    }}>Go to Chat</Link>
                </div>
            </div>
        );
    }

    const user = await userService.getUserById(userId);

    if (!user) {
        return (
            <div style={{ maxWidth: 960, margin: "0 auto", padding: "80px 32px", textAlign: "center" }}>
                <div style={{
                    background: "var(--bg-card)", border: "1px solid var(--border)",
                    borderRadius: 16, padding: 48, maxWidth: 480, margin: "0 auto",
                }}>
                    <div style={{ fontSize: 48, marginBottom: 20 }}>⚠️</div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>User Not Found</h2>
                    <p style={{ color: "var(--text-sec)", marginBottom: 28, lineHeight: 1.6 }}>
                        We couldn&apos;t find your data. Please try uploading your audio again.
                    </p>
                    <Link href="/" style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        padding: "10px 24px", borderRadius: 10,
                        background: "linear-gradient(135deg, var(--accent), #8b5cf6)",
                        color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none",
                    }}>Go to Chat</Link>
                </div>
            </div>
        );
    }

    const goals = await financeService.getGoals(userId);

    return <GoalsClient goals={goals} />;
}
