import React from "react";
import { financeService } from "@/services/finance";
import { userService } from "@/services/user";
import Link from "next/link";
import DashboardClient from "./DashboardClient";
import { getSession } from "@/lib/session";

export const dynamic = 'force-dynamic'; // Ensure we get fresh data on page load

export default async function DashboardPage() {
    const session = await getSession();
    const userId = session.isAuthenticated ? session.userId : undefined;

    if (!userId) {
        return (
            <div style={{ maxWidth: 960, margin: "0 auto", padding: "80px 32px", textAlign: "center" }}>
                <div style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: 16,
                    padding: 48,
                    maxWidth: 480,
                    margin: "0 auto",
                }}>
                    <div style={{ fontSize: 48, marginBottom: 20 }}>🔒</div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>No Active Session</h2>
                    <p style={{ color: "var(--text-sec)", marginBottom: 28, lineHeight: 1.6 }}>
                        Please go to the Chat page and start a conversation with the AI advisor to view your dashboard.
                    </p>
                    <Link
                        href="/"
                        style={{
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                            padding: "10px 24px", borderRadius: 10, border: "none",
                            background: "linear-gradient(135deg, var(--accent), #8b5cf6)",
                            color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none",
                        }}
                    >
                        Go to Chat
                    </Link>
                </div>
            </div>
        );
    }

    // 1. Identify User
    const user = await userService.getUserById(userId);

    if (!user) {
        return (
            <div style={{ maxWidth: 960, margin: "0 auto", padding: "80px 32px", textAlign: "center" }}>
                <div style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: 16,
                    padding: 48,
                    maxWidth: 480,
                    margin: "0 auto",
                }}>
                    <div style={{ fontSize: 48, marginBottom: 20 }}>⚠️</div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>User Not Found</h2>
                    <p style={{ color: "var(--text-sec)", marginBottom: 28, lineHeight: 1.6 }}>
                        We couldn&apos;t find your data. Please try uploading your audio again.
                    </p>
                    <Link
                        href="/"
                        style={{
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                            padding: "10px 24px", borderRadius: 10, border: "none",
                            background: "linear-gradient(135deg, var(--accent), #8b5cf6)",
                            color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none",
                        }}
                    >
                        Go to Chat
                    </Link>
                </div>
            </div>
        );
    }

    // 2. Fetch Data
    const summary = await financeService.getFinancialSummary(userId);
    const history = await financeService.getFinancialHistory(userId);
    const goals = await financeService.getGoals(userId);

    // 3. Transform Data for Charts
    const netWorthData = history.map(h => ({ date: h.date, value: h.netWorth }));
    const assetsData = history.map(h => ({ date: h.date, value: h.assets }));
    const debtsData = history.map(h => ({ date: h.date, value: h.debts }));

    return (
        <DashboardClient
            summary={summary}
            history={netWorthData.map((n, i) => ({
                date: n.date,
                netWorth: n.value,
                assets: assetsData[i]?.value || 0,
                debts: debtsData[i]?.value || 0
            }))}
            goals={goals}
        />
    );
}
