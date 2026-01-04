"use client";

import { TrendingUp } from "lucide-react";

interface AssetItem {
    id: string;
    name: string;
    type: string;
    value: string;
}

interface SummaryCardsProps {
    netWorth: number;
    totalAssets: number;
    totalDebts: number;
    assets: AssetItem[];
    debts: AssetItem[];
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(value);
};

// Color palettes matching Net Worth Trend chart
const ASSET_COLORS = ["#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#d1fae5"];
const DEBT_COLORS = ["#ef4444", "#f87171", "#fca5a5", "#fecaca", "#fee2e2"];

// Simple CSS-based donut chart using conic-gradient
interface DonutChartProps {
    items: { name: string; value: number; percentage: number; color: string }[];
    total: number;
    centerLabel: string;
}

function DonutChart({ items, centerLabel }: DonutChartProps) {
    // Build conic-gradient segments
    let gradientParts: string[] = [];
    let currentAngle = 0;

    items.forEach((item) => {
        const angle = (item.percentage / 100) * 360;
        gradientParts.push(`${item.color} ${currentAngle}deg ${currentAngle + angle}deg`);
        currentAngle += angle;
    });

    // Handle empty state
    if (items.length === 0) {
        gradientParts = ["#e5e7eb 0deg 360deg"];
    }

    const gradient = `conic-gradient(${gradientParts.join(", ")})`;

    return (
        <div
            className="w-20 h-20 rounded-full flex items-center justify-center relative flex-shrink-0"
            style={{ background: gradient }}
        >
            {/* Inner white circle to create donut effect */}
            <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center">
                <span className="text-xs font-semibold text-gray-700">{centerLabel}</span>
            </div>
        </div>
    );
}

export default function SummaryCards({ netWorth, totalAssets, totalDebts, assets, debts }: SummaryCardsProps) {
    // Process assets with percentages and colors (sorted by value descending)
    const processedAssets = assets
        .map((asset, index) => ({
            ...asset,
            numericValue: parseFloat(asset.value),
        }))
        .sort((a, b) => b.numericValue - a.numericValue)
        .map((asset, index) => ({
            name: asset.name,
            value: asset.numericValue,
            percentage: totalAssets > 0 ? Math.round((asset.numericValue / totalAssets) * 100) : 0,
            color: ASSET_COLORS[index % ASSET_COLORS.length],
        }));

    // Process debts with percentages and colors (sorted by value descending)
    const processedDebts = debts
        .map((debt) => ({
            ...debt,
            numericValue: parseFloat(debt.value),
        }))
        .sort((a, b) => b.numericValue - a.numericValue)
        .map((debt, index) => ({
            name: debt.name,
            value: debt.numericValue,
            percentage: totalDebts > 0 ? Math.round((debt.numericValue / totalDebts) * 100) : 0,
            color: DEBT_COLORS[index % DEBT_COLORS.length],
        }));

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

            {/* Assets Breakdown Card */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm shadow-gray-900/5 p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Assets Breakdown</h3>
                {processedAssets.length > 0 ? (
                    <div className="flex items-center gap-4 min-h-24">
                        <DonutChart
                            items={processedAssets}
                            total={totalAssets}
                            centerLabel={formatCurrency(totalAssets)}
                        />
                        <div className="flex-1 space-y-2 text-sm">
                            {processedAssets.map((asset, index) => (
                                <div key={index} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-2 h-2 rounded-full"
                                            style={{ backgroundColor: asset.color }}
                                        />
                                        <span className="text-gray-600">{asset.name}</span>
                                    </div>
                                    <span className="text-gray-900 font-medium">{asset.percentage}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-4 text-gray-500 text-sm">
                        No assets recorded
                    </div>
                )}
            </div>

            {/* Debts Breakdown Card */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm shadow-gray-900/5 p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Debts Breakdown</h3>
                {processedDebts.length > 0 ? (
                    <div className="flex items-center gap-4 min-h-24">
                        <DonutChart
                            items={processedDebts}
                            total={totalDebts}
                            centerLabel={formatCurrency(totalDebts)}
                        />
                        <div className="flex-1 space-y-2 text-sm">
                            {processedDebts.map((debt, index) => (
                                <div key={index} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-2 h-2 rounded-full"
                                            style={{ backgroundColor: debt.color }}
                                        />
                                        <span className="text-gray-600">{debt.name}</span>
                                    </div>
                                    <span className="text-gray-900 font-medium">{debt.percentage}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-4 text-gray-500 text-sm">
                        No debts recorded
                    </div>
                )}
            </div>
        </div>
    );
}
