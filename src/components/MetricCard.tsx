import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ComposedChart, Bar, ReferenceLine } from "recharts";

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

export default function MetricCard({ title, currentValue, data, type = "networth", range, onRangeChange }: MetricCardProps) {
    const color = type === "debt" ? "#f87171" : "#60a5fa";

    const composedData = type === "networth"
        ? data.map(d => ({ ...d, debtsNegative: d.debts ? -d.debts : 0 }))
        : data;

    const yearBoundaries: { date: string; prevYear: number; currYear: number }[] = [];
    if (type === "networth" && composedData.length > 1) {
        let lastYear = new Date(composedData[0].date).getFullYear();
        for (let i = 1; i < composedData.length; i++) {
            const currentYear = new Date(composedData[i].date).getFullYear();
            if (currentYear !== lastYear) {
                yearBoundaries.push({ date: composedData[i].date, prevYear: lastYear, currYear: currentYear });
                lastYear = currentYear;
            }
        }
    }

    const formatDateTick = (dateStr: string) => {
        const date = new Date(dateStr);
        if (range === "YTD" || range === "1Y") {
            return date.toLocaleDateString("en-US", { month: "short" });
        } else {
            return date.toLocaleDateString("en-US", { year: "2-digit", month: "short" });
        }
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    background: "#181b24",
                    border: "1px solid #2a2f3e",
                    borderRadius: 10,
                    padding: "10px 14px",
                    fontSize: 12,
                    color: "#e8eaf0",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                }}>
                    <p style={{ fontWeight: 600, marginBottom: 8 }}>
                        {new Date(label).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </p>
                    {payload.map((entry: any, index: number) => {
                        let name = entry.name;
                        let value = entry.value;
                        let dotColor = entry.color;

                        if (entry.dataKey === "assets") { name = "Total Assets"; dotColor = "#34d399"; }
                        else if (entry.dataKey === "debtsNegative") { name = "Total Debt"; value = Math.abs(value); dotColor = "#f87171"; }
                        else if (entry.dataKey === "value") { name = "Net Worth"; dotColor = "#c36eff"; }

                        return (
                            <div key={index} style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 4 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: dotColor }}/>
                                    <span style={{ color: "#8b91a5" }}>{name}:</span>
                                </div>
                                <span style={{ fontFamily: "monospace" }}>{formatCurrency(value)}</span>
                            </div>
                        );
                    })}
                </div>
            );
        }
        return null;
    };

    const YearDividerLabel = (props: any) => {
        const { viewBox, boundary } = props;
        const x = viewBox.x;
        const y = viewBox.y;
        return (
            <g>
                <text x={x - 10} y={y - 10} fill="#5c6178" textAnchor="end" fontSize={10}>← {boundary.prevYear}</text>
                <text x={x + 10} y={y - 10} fill="#5c6178" textAnchor="start" fontSize={10}>{boundary.currYear} →</text>
            </g>
        );
    };

    return (
        <div style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 24,
            display: "flex",
            flexDirection: "column",
            height: 320,
        }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>
                    {type === "networth" ? "Net Worth Trend" : title}
                </div>
                {onRangeChange && (
                    <div style={{ display: "flex", gap: 4 }}>
                        {(["YTD", "1Y", "ALL"] as const).map((r) => (
                            <button
                                key={r}
                                onClick={() => onRangeChange(r)}
                                style={{
                                    padding: "4px 10px",
                                    borderRadius: 6,
                                    border: "none",
                                    fontSize: 11,
                                    fontWeight: 500,
                                    cursor: "pointer",
                                    background: range === r ? "var(--accent)" : "transparent",
                                    color: range === r ? "#fff" : "var(--text-ter)",
                                    transition: "all 0.15s",
                                }}
                            >{r === "ALL" ? "All" : r}</button>
                        ))}
                    </div>
                )}
            </div>

            {/* Chart */}
            <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                    {type === "networth" ? (
                        <ComposedChart data={composedData} margin={{ top: 30, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2a2f3e" />
                            <XAxis
                                dataKey="date"
                                tickFormatter={formatDateTick}
                                tick={{ fontSize: 10, fill: "#5c6178" }}
                                axisLine={false}
                                tickLine={false}
                                minTickGap={30}
                            />
                            <YAxis
                                tickFormatter={formatCompactCurrency}
                                tick={{ fontSize: 10, fill: "#5c6178" }}
                                axisLine={false}
                                tickLine={false}
                                domain={["auto", "auto"]}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(195,110,255,0.06)" }} />
                            <ReferenceLine y={0} stroke="#2a2f3e" />
                            {yearBoundaries.map((boundary, index) => (
                                <ReferenceLine
                                    key={index}
                                    x={boundary.date}
                                    stroke="#2a2f3e"
                                    strokeDasharray="3 3"
                                    label={<YearDividerLabel boundary={boundary} />}
                                />
                            ))}
                            <Bar dataKey="assets" fill="#34d399" barSize={20} radius={[4, 4, 0, 0]} opacity={0.7} />
                            <Bar dataKey="debtsNegative" fill="#f87171" barSize={20} radius={[0, 0, 4, 4]} opacity={0.7} />
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke="#c36eff"
                                strokeWidth={2.5}
                                dot={{ r: 3, fill: "#c36eff", strokeWidth: 2, stroke: "#181b24" }}
                                activeDot={{ r: 5 }}
                            />
                        </ComposedChart>
                    ) : (
                        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2a2f3e" />
                            <XAxis
                                dataKey="date"
                                tickFormatter={formatDateTick}
                                tick={{ fontSize: 10, fill: "#5c6178" }}
                                axisLine={false}
                                tickLine={false}
                                minTickGap={30}
                            />
                            <YAxis
                                tickFormatter={formatCompactCurrency}
                                tick={{ fontSize: 10, fill: "#5c6178" }}
                                axisLine={false}
                                tickLine={false}
                                domain={["auto", "auto"]}
                            />
                            <Tooltip
                                formatter={(value: number | undefined) => value !== undefined ? formatCurrency(value) : ""}
                                labelFormatter={(label) => new Date(label).toLocaleDateString()}
                                contentStyle={{
                                    background: "#181b24",
                                    border: "1px solid #2a2f3e",
                                    borderRadius: 8,
                                    color: "#e8eaf0",
                                }}
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
