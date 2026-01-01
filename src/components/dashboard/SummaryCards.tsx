"use client";

import { TrendingUp } from "lucide-react";

interface SummaryCardsProps {
    netWorth: number;
    totalAssets: number;
    totalDebts: number;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(value);
};

export default function SummaryCards({ netWorth, totalAssets, totalDebts }: SummaryCardsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Net Worth Card */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm shadow-gray-900/5 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-900">Net Worth</h3>
                    <TrendingUp className="w-4 h-4 text-gray-400" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                    {formatCurrency(netWorth)}
                </div>
                <div className="text-sm text-emerald-600 flex items-center gap-1">
                    <span>↗</span>
                    <span>+$5,200 this month</span>
                </div>
            </div>

            {/* Assets Breakdown Card - Placeholder */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm shadow-gray-900/5 p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Assets Breakdown</h3>
                <div className="flex items-center gap-4">
                    {/* Placeholder donut chart */}
                    <div className="w-20 h-20 rounded-full border-8 border-fuchsia-400 border-t-fuchsia-600 border-r-fuchsia-500 border-b-pink-300 flex items-center justify-center">
                        <span className="text-xs font-semibold text-gray-700">{formatCurrency(totalAssets)}</span>
                    </div>
                    <div className="flex-1 space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-fuchsia-600" />
                                <span className="text-gray-600">Stocks</span>
                            </div>
                            <span className="text-gray-900 font-medium">40%</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-fuchsia-500" />
                                <span className="text-gray-600">Real Estate</span>
                            </div>
                            <span className="text-gray-900 font-medium">35%</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-fuchsia-400" />
                                <span className="text-gray-600">Cash</span>
                            </div>
                            <span className="text-gray-900 font-medium">15%</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-pink-300" />
                                <span className="text-gray-600">Crypto</span>
                            </div>
                            <span className="text-gray-900 font-medium">10%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Debts Breakdown Card - Placeholder */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm shadow-gray-900/5 p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Debts Breakdown</h3>
                <div className="text-2xl font-bold text-gray-900 mb-4">{formatCurrency(totalDebts)}</div>

                {/* Stacked bar */}
                <div className="h-3 rounded-full overflow-hidden flex mb-4">
                    <div className="bg-fuchsia-600 w-[70%]" />
                    <div className="bg-fuchsia-400 w-[20%]" />
                    <div className="bg-pink-300 w-[10%]" />
                </div>

                <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-fuchsia-600" />
                            <span className="text-gray-600">Mortgage</span>
                        </div>
                        <span className="text-gray-900 font-medium">70%</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-fuchsia-400" />
                            <span className="text-gray-600">Student Loan</span>
                        </div>
                        <span className="text-gray-900 font-medium">20%</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-pink-300" />
                            <span className="text-gray-600">Credit Card</span>
                        </div>
                        <span className="text-gray-900 font-medium">10%</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
