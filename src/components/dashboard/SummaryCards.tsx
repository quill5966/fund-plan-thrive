"use client";

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

const ASSET_COLORS = ["#34d399", "#c36eff", "#60a5fa", "#fbbf24", "#f87171"];
const DEBT_COLORS = ["#f87171", "#fb923c", "#fbbf24", "#fca5a5", "#fee2e2"];

const PencilIcon = () => (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8.5 1.5l2 2L4 10H2V8z"/>
    </svg>
);

interface DonutChartProps {
    items: { name: string; value: number; percentage: number; color: string }[];
    centerLabel: string;
}

function DonutChart({ items, centerLabel }: DonutChartProps) {
    let gradientParts: string[] = [];
    let currentAngle = 0;

    items.forEach((item) => {
        const angle = (item.percentage / 100) * 360;
        gradientParts.push(`${item.color} ${currentAngle}deg ${currentAngle + angle}deg`);
        currentAngle += angle;
    });

    if (items.length === 0) {
        gradientParts = ["#2a2f3e 0deg 360deg"];
    }

    const gradient = `conic-gradient(${gradientParts.join(", ")})`;

    return (
        <div
            style={{
                width: 72, height: 72, borderRadius: "50%",
                background: gradient,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                position: "relative",
            }}
        >
            <div style={{
                width: 50, height: 50, borderRadius: "50%",
                background: "var(--bg-card)",
                display: "flex", alignItems: "center", justifyContent: "center",
            }}>
                <span style={{ fontSize: 9, fontWeight: 600, color: "var(--text-sec)" }}>{centerLabel}</span>
            </div>
        </div>
    );
}

export default function SummaryCards({ netWorth, totalAssets, totalDebts, assets, debts }: SummaryCardsProps) {
    const processedAssets = assets
        .map(asset => ({ ...asset, numericValue: parseFloat(asset.value) }))
        .sort((a, b) => b.numericValue - a.numericValue)
        .map((asset, index) => ({
            name: asset.name,
            value: asset.numericValue,
            percentage: totalAssets > 0 ? Math.round((asset.numericValue / totalAssets) * 100) : 0,
            color: ASSET_COLORS[index % ASSET_COLORS.length],
        }));

    const processedDebts = debts
        .map(debt => ({ ...debt, numericValue: parseFloat(debt.value) }))
        .sort((a, b) => b.numericValue - a.numericValue)
        .map((debt, index) => ({
            name: debt.name,
            value: debt.numericValue,
            percentage: totalDebts > 0 ? Math.round((debt.numericValue / totalDebts) * 100) : 0,
            color: DEBT_COLORS[index % DEBT_COLORS.length],
        }));

    const cardStyle: React.CSSProperties = {
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 20,
    };

    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
            {/* Net Worth Card */}
            <div style={cardStyle}>
                <div style={{ fontSize: 12, color: "var(--text-sec)", marginBottom: 8, fontWeight: 500 }}>Net Worth</div>
                <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text)" }}>
                    {formatCurrency(netWorth)}
                </div>
                <div style={{ fontSize: 12, color: "var(--green)", marginTop: 4 }}>+$5,200 this month</div>
            </div>

            {/* Assets Card */}
            <div style={cardStyle}>
                <div style={{ fontSize: 12, color: "var(--text-sec)", marginBottom: 8, fontWeight: 500 }}>Assets</div>
                <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text)", marginBottom: 12 }}>
                    {formatCurrency(totalAssets)}
                </div>
                {processedAssets.length > 0 ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <DonutChart items={processedAssets} centerLabel={`$${Math.round(totalAssets / 1000)}k`} />
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                            {processedAssets.map((asset, i) => (
                                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                                    <span style={{ color: "var(--text-sec)", display: "flex", alignItems: "center", gap: 6 }}>
                                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: asset.color, display: "inline-block" }}/>
                                        {asset.name}
                                        <span style={{ color: "var(--text-ter)", cursor: "pointer", opacity: 0.7 }}><PencilIcon /></span>
                                    </span>
                                    <span style={{ color: "var(--text)" }}>${asset.value.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div style={{ fontSize: 12, color: "var(--text-ter)" }}>No assets recorded</div>
                )}
            </div>

            {/* Debts Card */}
            <div style={cardStyle}>
                <div style={{ fontSize: 12, color: "var(--text-sec)", marginBottom: 8, fontWeight: 500 }}>Debts</div>
                <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text)", marginBottom: 12 }}>
                    {formatCurrency(totalDebts)}
                </div>
                {processedDebts.length > 0 ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <DonutChart items={processedDebts} centerLabel={`$${Math.round(totalDebts / 1000)}k`} />
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                            {processedDebts.map((debt, i) => (
                                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                                    <span style={{ color: "var(--text-sec)", display: "flex", alignItems: "center", gap: 6 }}>
                                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: debt.color, display: "inline-block" }}/>
                                        {debt.name}
                                        <span style={{ color: "var(--text-ter)", cursor: "pointer", opacity: 0.7 }}><PencilIcon /></span>
                                    </span>
                                    <span style={{ color: "var(--text)" }}>${debt.value.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div style={{ fontSize: 12, color: "var(--text-ter)" }}>No debts recorded</div>
                )}
            </div>
        </div>
    );
}
