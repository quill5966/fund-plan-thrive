import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ComposedChart, Bar, ReferenceLine } from "recharts";
import { Info } from "lucide-react";
import clsx from "clsx";

interface MetricCardProps {
    title: string;
    currentValue: number;
    data: { date: string; value: number; assets?: number; debts?: number }[];
    type?: "asset" | "debt" | "networth";
    infoTooltip?: string;
    range?: "YTD" | "1Y" | "ALL";
    onRangeChange?: (range: "YTD" | "1Y" | "ALL") => void;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(value);
};

const formatCompactCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        notation: "compact",
        maximumFractionDigits: 1,
    }).format(value);
};

export default function MetricCard({ title, currentValue, data, type = "networth", infoTooltip, range, onRangeChange }: MetricCardProps) {
    // Determine color based on type
    const color = type === "debt" ? "#ef4444" : "#3b82f6";

    // Prepare data for composed chart (negate debts for visual bar)
    const composedData = type === "networth"
        ? data.map(d => ({
            ...d,
            debtsNegative: d.debts ? -d.debts : 0
        }))
        : data;

    // Calculate Year Boundaries for Net Worth chart
    const yearBoundaries: { date: string; prevYear: number; currYear: number }[] = [];
    if (type === "networth" && composedData.length > 1) {
        let lastYear = new Date(composedData[0].date).getFullYear();
        for (let i = 1; i < composedData.length; i++) {
            const currentYear = new Date(composedData[i].date).getFullYear();
            if (currentYear !== lastYear) {
                yearBoundaries.push({
                    date: composedData[i].date, // The first data point of the new year
                    prevYear: lastYear,
                    currYear: currentYear
                });
                lastYear = currentYear;
            }
        }
    }

    const formatDateTick = (dateStr: string) => {
        const date = new Date(dateStr);
        // Default to monthly format since we removed 1M and are densifying monthly
        if (range === "YTD" || range === "1Y") {
            return date.toLocaleDateString('en-US', { month: 'short' });
        } else {
            return date.toLocaleDateString('en-US', { year: '2-digit', month: 'short' });
        }
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-gray-900 text-white p-3 rounded-lg shadow-lg border border-gray-700 text-xs z-50">
                    <p className="font-semibold mb-2">{new Date(label).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                    {/* Iterate through payload to show all metrics */}
                    {payload.map((entry: any, index: number) => {
                        let name = entry.name;
                        let value = entry.value;
                        let color = entry.color;

                        // Customize labels and values for networth chart
                        if (entry.dataKey === "assets") {
                            name = "Total Assets";
                            color = "#10b981"; // Green
                        } else if (entry.dataKey === "debtsNegative") {
                            name = "Total Debt";
                            value = Math.abs(value); // Show positive value
                            color = "#ef4444"; // Red
                        } else if (entry.dataKey === "value") {
                            name = "Net Worth";
                            color = "#ffffff";
                        }

                        return (
                            <div key={index} className="flex items-center justify-between gap-4 mb-1">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                    <span>{name}:</span>
                                </div>
                                <span className="font-mono">{formatCurrency(value)}</span>
                            </div>
                        );
                    })}
                </div>
            );
        }
        return null;
    };

    // Custom Label for Year Divider
    const YearDividerLabel = (props: any) => {
        const { viewBox, boundary } = props;
        const x = viewBox.x;
        const y = viewBox.y;

        return (
            <g>
                {/* Previous Year (Left) */}
                <text x={x - 10} y={y - 10} fill="#9ca3af" textAnchor="end" fontSize={10}>
                    ← {boundary.prevYear}
                </text>
                {/* Current Year (Right) */}
                <text x={x + 10} y={y - 10} fill="#6b7280" textAnchor="start" fontSize={10}>
                    {boundary.currYear} →
                </text>
            </g>
        );
    };

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm shadow-gray-900/5 p-6 flex flex-col h-80">
            {/* Header with Title and Time Toggles */}
            <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-semibold text-gray-900">
                    {type === "networth" ? "Net Worth Trend" : title}
                </span>
                {onRangeChange && (
                    <div className="flex bg-gray-100 rounded-lg p-1 text-xs">
                        {(["YTD", "1Y", "ALL"] as const).map((r) => (
                            <button
                                key={r}
                                onClick={() => onRangeChange(r)}
                                className={clsx(
                                    "px-3 py-1 rounded font-medium transition-all duration-200",
                                    range === r
                                        ? "bg-fuchsia-500 text-white shadow-sm"
                                        : "text-gray-600 hover:text-gray-900"
                                )}
                            >
                                {r === "ALL" ? "All" : r}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Chart Section */}
            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    {type === "networth" ? (
                        <ComposedChart data={composedData} margin={{ top: 30, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis
                                dataKey="date"
                                tickFormatter={formatDateTick}
                                tick={{ fontSize: 10, fill: '#9ca3af' }}
                                axisLine={false}
                                tickLine={false}
                                minTickGap={30}
                            />
                            <YAxis
                                tickFormatter={formatCompactCurrency}
                                tick={{ fontSize: 10, fill: '#9ca3af' }}
                                axisLine={false}
                                tickLine={false}
                                domain={['auto', 'auto']}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                            <ReferenceLine y={0} stroke="#e5e7eb" />

                            {/* Year Dividers */}
                            {yearBoundaries.map((boundary, index) => (
                                <ReferenceLine
                                    key={index}
                                    x={boundary.date}
                                    stroke="#e5e7eb"
                                    strokeDasharray="3 3"
                                    label={<YearDividerLabel boundary={boundary} />}
                                />
                            ))}

                            <Bar dataKey="assets" fill="#10b981" barSize={20} radius={[4, 4, 0, 0]} />
                            <Bar dataKey="debtsNegative" fill="#ef4444" barSize={20} radius={[0, 0, 4, 4]} />
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke="#D946EF" // Fuchsia for net worth line
                                strokeWidth={3}
                                dot={{ r: 4, fill: "#D946EF", strokeWidth: 2, stroke: "#fff" }}
                                activeDot={{ r: 6 }}
                            />
                        </ComposedChart>
                    ) : (
                        // Fallback to simple line chart for other types
                        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis
                                dataKey="date"
                                tickFormatter={formatDateTick}
                                tick={{ fontSize: 10, fill: '#9ca3af' }}
                                axisLine={false}
                                tickLine={false}
                                minTickGap={30}
                            />
                            <YAxis
                                tickFormatter={formatCompactCurrency}
                                tick={{ fontSize: 10, fill: '#9ca3af' }}
                                axisLine={false}
                                tickLine={false}
                                domain={['auto', 'auto']}
                            />
                            <Tooltip
                                formatter={(value: number | undefined) => value !== undefined ? formatCurrency(value) : ''}
                                labelFormatter={(label) => new Date(label).toLocaleDateString()}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke={color}
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4 }}
                            />
                        </LineChart>
                    )}
                </ResponsiveContainer>
            </div>
        </div>
    );
}
