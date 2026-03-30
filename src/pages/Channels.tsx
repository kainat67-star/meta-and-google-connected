import { AnimatedChartBox, AnimatedChartPlot, chartEase, chartInViewOptions } from "@/components/AnimatedChartShell";
import { DashboardLayout } from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Sector,
} from "recharts";
import { useState } from "react";

const platforms = [
  { name: "Meta Ads", spend: 33600, revenue: 127680, conversions: 4100, roas: 3.8, color: "#1877f2", short: "Meta" },
  { name: "Google Ads", spend: 36600, revenue: 153720, conversions: 4820, roas: 4.2, color: "#4285f4", short: "Google" },
  { name: "TikTok Ads", spend: 26200, revenue: 81220, conversions: 3200, roas: 3.1, color: "#fe2c55", short: "TikTok" },
  { name: "Snapchat Ads", spend: 12600, revenue: 36540, conversions: 1580, roas: 2.9, color: "#d4d400", short: "Snap" },
  { name: "X Ads", spend: 9200, revenue: 22080, conversions: 980, roas: 2.4, color: "#a1a1aa", short: "X" },
];

const pieData = platforms.map((p) => ({ name: p.short, full: p.name, value: p.spend, color: p.color }));
const barData = platforms.map((p) => ({ name: p.short, Spend: p.spend, Revenue: p.revenue }));

const CustomPieTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: (typeof pieData)[0] }[] }) => {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="glass-card !bg-card/95 border border-border p-3 text-xs shadow-xl backdrop-blur-md">
      <p className="text-foreground font-semibold">{d.full}</p>
      <p className="text-muted-foreground mt-0.5">Budget share · ${d.value.toLocaleString()}</p>
    </div>
  );
};

const CustomBarTooltip = ({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; value: number; color: string }[]; label?: string }) => {
  if (!active || !payload) return null;
  return (
    <div className="glass-card !bg-card/95 border border-border p-3 text-xs shadow-xl backdrop-blur-md min-w-[160px]">
      <p className="text-foreground font-semibold mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex justify-between gap-4 py-0.5">
          <span style={{ color: p.color }}>{p.dataKey}</span>
          <span className="text-foreground font-medium tabular-nums">${p.value.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
};

function PlatformLegendBadge({ color, short, full }: { color: string; short: string; full: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
      <span
        className="inline-flex items-center justify-center min-w-[2.25rem] h-6 px-1.5 rounded-md font-bold text-[10px] border border-white/10"
        style={{ backgroundColor: `${color}22`, color, borderColor: `${color}44` }}
      >
        {short}
      </span>
      <span className="font-medium text-foreground/90">{full}</span>
    </div>
  );
}

const Channels = () => {
  const total = platforms.reduce((s, p) => s + p.spend, 0);
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const renderActiveShape = (props: unknown) => {
    const p = props as {
      cx: number;
      cy: number;
      innerRadius: number;
      outerRadius: number;
      startAngle: number;
      endAngle: number;
      fill: string;
    };
    return (
      <g>
        <Sector
          cx={p.cx}
          cy={p.cy}
          innerRadius={p.innerRadius}
          outerRadius={p.outerRadius + 6}
          startAngle={p.startAngle}
          endAngle={p.endAngle}
          fill={p.fill}
          opacity={0.95}
        />
        <Sector
          cx={p.cx}
          cy={p.cy}
          startAngle={p.startAngle}
          endAngle={p.endAngle}
          innerRadius={p.outerRadius + 8}
          outerRadius={p.outerRadius + 10}
          fill={p.fill}
          opacity={0.35}
        />
      </g>
    );
  };

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <AnimatedChartBox className="glass-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-0.5">Budget allocation</h3>
          <p className="text-xs text-muted-foreground mb-4">Share of spend by platform · Total ${total.toLocaleString()}</p>
          <AnimatedChartPlot staggerAfterBox={0.22}>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <defs>
                {pieData.map((entry, i) => (
                  <linearGradient key={i} id={`pie-grad-${i}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
                    <stop offset="100%" stopColor={entry.color} stopOpacity={0.55} />
                  </linearGradient>
                ))}
              </defs>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={72}
                outerRadius={108}
                paddingAngle={4}
                dataKey="value"
                isAnimationActive
                animationBegin={320}
                animationDuration={1200}
                activeIndex={activeIndex}
                activeShape={renderActiveShape as never}
                onMouseEnter={(_, i) => setActiveIndex(i)}
                onMouseLeave={() => setActiveIndex(undefined)}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={`url(#pie-grad-${i})`} stroke="hsl(var(--background))" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          </AnimatedChartPlot>
          <div className="flex flex-wrap gap-x-5 gap-y-3 mt-2 justify-center">
            {platforms.map((p) => (
              <PlatformLegendBadge key={p.name} color={p.color} short={p.short} full={p.name} />
            ))}
          </div>
        </AnimatedChartBox>

        <AnimatedChartBox className="glass-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-0.5">Spend vs revenue</h3>
          <p className="text-xs text-muted-foreground mb-4">Grouped comparison by platform</p>
          <AnimatedChartPlot staggerAfterBox={0.26}>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={barData} barGap={6}>
              <defs>
                <linearGradient id="bar-spend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.45} />
                </linearGradient>
                <linearGradient id="bar-rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.2)" }} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                formatter={(v) => <span className="text-muted-foreground">{v}</span>}
              />
              <Bar
                dataKey="Spend"
                fill="url(#bar-spend)"
                radius={[6, 6, 0, 0]}
                isAnimationActive
                animationBegin={380}
                animationDuration={1150}
              />
              <Bar
                dataKey="Revenue"
                fill="url(#bar-rev)"
                radius={[6, 6, 0, 0]}
                isAnimationActive
                animationBegin={460}
                animationDuration={1150}
              />
            </BarChart>
          </ResponsiveContainer>
          </AnimatedChartPlot>
        </AnimatedChartBox>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={chartInViewOptions}
        transition={{ duration: 0.92, ease: chartEase }}
        className="glass-card overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-border/80">
          <h3 className="text-sm font-semibold text-foreground">Platform breakdown</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Aligned with connected accounts in Settings</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-accent/15">
                {["Platform", "Spend", "Revenue", "Conversions", "ROAS"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {platforms.map((p, i) => (
                <motion.tr
                  key={p.name}
                  initial={{ opacity: 0, y: 6 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={chartInViewOptions}
                  transition={{ duration: 0.72, delay: 0.28 + i * 0.06, ease: chartEase }}
                  className="border-b border-border/50 hover:bg-accent/20 transition-colors"
                >
                  <td className="px-5 py-3">
                    <PlatformLegendBadge color={p.color} short={p.short} full={p.name} />
                  </td>
                  <td className="px-5 py-3 text-foreground tabular-nums font-medium">${p.spend.toLocaleString()}</td>
                  <td className="px-5 py-3 metric-positive tabular-nums font-semibold">${p.revenue.toLocaleString()}</td>
                  <td className="px-5 py-3 text-muted-foreground tabular-nums">{p.conversions.toLocaleString()}</td>
                  <td className="px-5 py-3">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">{p.roas}x</span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </DashboardLayout>
  );
};

export default Channels;
