import React from "react";
import { financeService } from "@/services/finance";
import { userService } from "@/services/user";
import { cookies } from "next/headers";
import Link from "next/link";
import DashboardClient from "./DashboardClient";

export const dynamic = 'force-dynamic'; // Ensure we get fresh data on page load

export default async function DashboardPage() {
    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value;

    if (!userId) {
        return (
            <div className="max-w-7xl mx-auto px-8 py-20 text-center">
                <div className="bg-white rounded-xl p-12 border border-gray-100 shadow-sm shadow-gray-900/5 max-w-2xl mx-auto">
                    <div className="text-5xl mb-6">🔒</div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">No Active Session</h2>
                    <p className="text-gray-600 mb-8 text-lg">
                        Please go to the Chat page and start a conversation with the AI advisor to view your dashboard.
                    </p>
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-fuchsia-500 hover:bg-fuchsia-600 transition-colors"
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
        // Cookie exists but user not found in DB? Treat as no session.
        return (
            <div className="max-w-7xl mx-auto px-8 py-20 text-center">
                <div className="bg-white rounded-xl p-12 border border-gray-100 shadow-sm shadow-gray-900/5 max-w-2xl mx-auto">
                    <div className="text-5xl mb-6">⚠️</div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">User Not Found</h2>
                    <p className="text-gray-600 mb-8 text-lg">
                        We couldn't find your data. Please try uploading your audio again.
                    </p>
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-fuchsia-500 hover:bg-fuchsia-600 transition-colors"
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
