"use client";

import React, { useState, useMemo } from "react";
import MetricCard from "@/components/MetricCard";
import SummaryCards from "@/components/dashboard/SummaryCards";
import Link from "next/link";
import { Target } from "lucide-react";

type TimeRange = "YTD" | "1Y" | "ALL";

interface Resource {
    id: string;
    title: string;
    url: string;
}

interface Step {
    id: string;
    description: string;
    order: string;
    isCompleted: boolean;
    isUserDefined: boolean;
    resources: Resource[];
}

interface Goal {
    id: string;
    title: string;
    targetAmount: string | null;
    currentAmount: string | null;
    steps: Step[];
    status: string;
}

interface DashboardClientProps {
    summary: {
        netWorth: number;
        totalAssets: number;
        totalDebts: number;
        assets: any[];
        debts: any[];
    };
    history: {
        date: string;
        assets: number;
        debts: number;
        netWorth: number;
    }[];
    goals: Goal[];
}

export default function DashboardClient({ summary, history, goals }: DashboardClientProps) {
    const [range, setRange] = useState<TimeRange>("YTD");

    const densifyHistory = (data: typeof history, range: TimeRange) => {
        if (data.length === 0) return [];

        const now = new Date();
        const endDate = new Date(now.getFullYear(), now.getMonth(), 1);
        let startDate: Date;

        if (range === "YTD") {
            startDate = new Date(now.getFullYear(), 0, 1);
        } else if (range === "1Y") {
            startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        } else {
            const userFirstDate = new Date(data[0].date);
            startDate = new Date(userFirstDate.getFullYear(), userFirstDate.getMonth(), 1);
        }

        const densified = [];
        let currentDate = new Date(startDate);

        let lastKnown = data.filter(d => new Date(d.date) <= startDate).pop() || {
            assets: 0,
            debts: 0,
            netWorth: 0
        };

        while (currentDate <= endDate) {
            const currentMonthStr = currentDate.toISOString().slice(0, 7);
            const dataInMonth = data.filter(d => d.date.startsWith(currentMonthStr));

            if (dataInMonth.length > 0) {
                const dataPoint = dataInMonth[dataInMonth.length - 1];
                lastKnown = {
                    assets: dataPoint.assets,
                    debts: dataPoint.debts,
                    netWorth: dataPoint.netWorth
                };
            }

            densified.push({
                date: currentDate.toISOString(),
                assets: lastKnown.assets,
                debts: lastKnown.debts,
                netWorth: lastKnown.netWorth
            });

            currentDate.setMonth(currentDate.getMonth() + 1);
        }

        return densified;
    };

    const filteredHistory = useMemo(() => {
        const sortedHistory = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        return densifyHistory(sortedHistory, range);
    }, [history, range]);

    const chartData = useMemo(() => {
        return {
            netWorth: filteredHistory.map(h => ({
                date: h.date,
                value: h.netWorth,
                assets: h.assets,
                debts: h.debts
            })),
        };
    }, [filteredHistory]);

    return (
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 32px 80px" }}>
            {/* Top bar */}
            <div style={{
                padding: "16px 0",
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                gap: 10,
            }}>
                <div style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: "linear-gradient(135deg, var(--accent), #8b5cf6)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
                }}>💰</div>
                <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--text)" }}>
                    Fund Plan Thrive
                </span>
            </div>

            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24, letterSpacing: "-0.02em", color: "var(--text)" }}>
                Overview
            </h1>

            {/* Bank connect banner */}
            <div style={{
                background: "rgba(96,165,250,0.08)",
                border: "1px solid rgba(96,165,250,0.2)",
                borderRadius: 10,
                padding: "10px 16px",
                marginBottom: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 13,
            }}>
                <span style={{ color: "var(--blue)" }}>🔗 Connect your bank accounts for automatic tracking</span>
                <button style={{
                    background: "rgba(96,165,250,0.15)",
                    border: "1px solid rgba(96,165,250,0.3)",
                    color: "var(--blue)",
                    padding: "5px 12px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                }}>Connect</button>
            </div>

            {/* Summary Cards Row */}
            <SummaryCards
                netWorth={summary.netWorth}
                totalAssets={summary.totalAssets}
                totalDebts={summary.totalDebts}
                assets={summary.assets}
                debts={summary.debts}
            />

            {/* Net Worth Trend Chart */}
            <div style={{ marginBottom: 24 }}>
                <MetricCard
                    title="Net Worth"
                    currentValue={summary.netWorth}
                    data={chartData.netWorth}
                    type="networth"
                    range={range}
                    onRangeChange={setRange}
                />
            </div>

            {/* Goals Summary Widget */}
            <div style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 24,
            }}>
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 16,
                }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>Goals</div>
                    <Link href="/goals" style={{
                        color: "var(--accent)",
                        fontSize: 13,
                        fontWeight: 500,
                        textDecoration: "none",
                    }}>View all →</Link>
                </div>

                {goals.length > 0 ? (
                    <div>
                        {goals.map((goal, i) => {
                            const target = parseFloat(goal.targetAmount || "0");
                            const current = parseFloat(goal.currentAmount || "0");
                            const hasTarget = target > 0;
                            const percentage = hasTarget ? Math.round((current / target) * 100) : Math.round(
                                (goal.steps.filter(s => s.isCompleted).length / Math.max(goal.steps.length, 1)) * 100
                            );
                            const doneSteps = goal.steps.filter(s => s.isCompleted).length;

                            return (
                                <Link
                                    key={goal.id}
                                    href="/goals"
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 16,
                                        padding: "12px 0",
                                        borderTop: i > 0 ? "1px solid var(--border)" : "none",
                                        textDecoration: "none",
                                        cursor: "pointer",
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>{goal.title}</div>
                                        {hasTarget ? (
                                            <div style={{ fontSize: 12, color: "var(--text-sec)", marginTop: 4 }}>
                                                ${current.toLocaleString()} / ${target.toLocaleString()} saved
                                            </div>
                                        ) : (
                                            <div style={{ fontSize: 12, color: "var(--text-ter)", marginTop: 4 }}>
                                                {doneSteps} of {goal.steps.length} steps done
                                            </div>
                                        )}
                                    </div>
                                    {/* Progress */}
                                    <div style={{ width: 120, display: "flex", alignItems: "center", gap: 8 }}>
                                        <div style={{
                                            flex: 1, height: 4,
                                            background: "var(--bg-surface)",
                                            borderRadius: 2,
                                            overflow: "hidden",
                                        }}>
                                            <div style={{
                                                width: `${Math.min(100, percentage)}%`,
                                                height: "100%",
                                                background: hasTarget ? "var(--green)" : "var(--accent)",
                                                borderRadius: 2,
                                            }}/>
                                        </div>
                                        <span style={{
                                            fontSize: 11,
                                            fontWeight: 500,
                                            minWidth: 36,
                                            textAlign: "center",
                                            padding: "2px 6px",
                                            borderRadius: 10,
                                            background: hasTarget ? "var(--green-dim)" : "var(--accent-dim)",
                                            color: hasTarget ? "var(--green)" : "var(--accent)",
                                        }}>{percentage}%</span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                ) : (
                    <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-ter)" }}>
                        <Target style={{ width: 32, height: 32, margin: "0 auto 8px", opacity: 0.4 }} />
                        <p style={{ fontSize: 14 }}>No goals yet. Start a conversation to create one.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
