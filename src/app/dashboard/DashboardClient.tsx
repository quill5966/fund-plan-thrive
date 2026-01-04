"use client";

import React, { useState, useMemo } from "react";
import MetricCard from "@/components/MetricCard";
import SummaryCards from "@/components/dashboard/SummaryCards";
import clsx from "clsx";
import Link from "next/link";
import { Target } from "lucide-react";

type TimeRange = "YTD" | "1Y" | "ALL";

// Goal types matching what financeService.getGoals returns
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
            assets: filteredHistory.map(h => ({ date: h.date, value: h.assets })),
            debts: filteredHistory.map(h => ({ date: h.date, value: h.debts })),
        };
    }, [filteredHistory]);

    return (
        <div className="max-w-7xl mx-auto px-8 py-8">
            <header className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
            </header>

            {/* Summary Cards Row */}
            <SummaryCards
                netWorth={summary.netWorth}
                totalAssets={summary.totalAssets}
                totalDebts={summary.totalDebts}
                assets={summary.assets}
                debts={summary.debts}
            />

            {/* Net Worth Trend Chart */}
            <div className="grid grid-cols-1 gap-6 mb-8">
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
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm shadow-gray-900/5 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900">Financial Goals</h2>
                    <Link
                        href="/goals"
                        className="text-sm text-fuchsia-500 hover:text-fuchsia-600 font-medium"
                    >
                        View all →
                    </Link>
                </div>

                {goals.length > 0 ? (
                    <div className="space-y-5">
                        {goals.map((goal) => {
                            const target = parseFloat(goal.targetAmount || "0");
                            const current = parseFloat(goal.currentAmount || "0");
                            const percentage = target > 0 ? Math.round((current / target) * 100) : 0;
                            const leftToSave = Math.max(0, target - current);

                            return (
                                <div key={goal.id} className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <Target className="w-4 h-4 text-fuchsia-500" />
                                            <span className="font-medium text-gray-900">{goal.title}</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-gray-500">
                                            <span className="font-semibold text-gray-900">{percentage}%</span>
                                            <span>Target <span className="text-emerald-600 font-medium">${target.toLocaleString()}</span></span>
                                            <span>Saved <span className="text-fuchsia-600 font-medium">${current.toLocaleString()}</span></span>
                                        </div>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-fuchsia-500 rounded-full transition-all duration-300"
                                            style={{ width: `${Math.min(100, percentage)}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-6 text-gray-500">
                        <Target className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p>No goals yet. Start a conversation to create one.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
