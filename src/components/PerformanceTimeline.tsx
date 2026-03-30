import { AnimatedChartBox, AnimatedChartPlot } from "@/components/AnimatedChartShell";
import { useMemo, useState } from "react";
import {
  Area,
  Brush,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const metrics = [
  { key: "spend", label: "Spend", color: "#ef4444", format: (v: number) => `$${(v / 1000).toFixed(1)}k` },
  { key: "revenue", label: "Revenue", color: "#10b981", format: (v: number) => `$${(v / 1000).toFixed(1)}k` },
  { key: "conversions", label: "Conversions", color: "#818cf8", format: (v: number) => v.toLocaleString() },
] as const;

const ranges = ["7D", "14D", "30D", "90D"] as const;

function buildSeries(days: number) {
  const start = 1;
  return Array.from({ length: days }, (_, i) => {
    const t = start + i;
    const wave = Math.sin(t / 5) * 0.12 + Math.cos(t / 9) * 0.08;
    const spend = Math.round(3200 + t * 45 + wave * 3500);
    const revenue = Math.round(spend * (3.8 + (t % 7) * 0.04));
    const conversions = Math.round(400 + t * 6 + wave * 120);
    return {
      date: `D${t}`,
      label: `Jul ${((i % 28) + 1).toString().padStart(2, "0")}`,
      spend,
      revenue,
      conversions,
    };
  });
}

const fullSeries = buildSeries(90);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  const title = row?.label ?? label;
  return (
    <div
      className="glass-card p-3.5 !rounded-xl text-xs border border-border shadow-2xl min-w-[180px]"
      style={{ background: "hsl(var(--card) / 0.95)", backdropFilter: "blur(16px)" }}
    >
      <p className="text-foreground font-semibold mb-2 text-[11px] tracking-wide uppercase">{title}</p>
      {payload.map((p: any) => {
        const m = metrics.find((x) => x.key === p.dataKey);
        const val =
          p.dataKey === "conversions"
            ? Number(p.value).toLocaleString()
            : `$${Number(p.value).toLocaleString()}`;
        return (
          <div key={p.dataKey} className="flex items-center gap-2 py-0.5">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
            <span className="text-muted-foreground">{m?.label ?? p.dataKey}</span>
            <span className="text-foreground font-semibold tabular-nums ml-auto">{val}</span>
          </div>
        );
      })}
    </div>
  );
};

export function PerformanceTimeline() {
  const [activeMetrics, setActiveMetrics] = useState<Set<string>>(new Set(["spend", "revenue", "conversions"]));
  const [range, setRange] = useState<(typeof ranges)[number]>("30D");

  const toggle = (key: string) => {
    setActiveMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else next.add(key);
      return next;
    });
  };

  const sliceLen = range === "7D" ? 7 : range === "14D" ? 14 : range === "30D" ? 30 : 90;
  const data = useMemo(() => fullSeries.slice(0, sliceLen), [sliceLen]);

  return (
    <AnimatedChartBox className="glass-card p-6">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-5">
        <div>
          <h3 className="chart-title text-base">Performance Timeline</h3>
          <p className="chart-subtitle">Spend, revenue, and conversions — drag the brush below to zoom</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex flex-wrap items-center gap-1">
            {metrics.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => toggle(m.key)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                  activeMetrics.has(m.key)
                    ? "bg-accent text-foreground ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: activeMetrics.has(m.key) ? m.color : "hsl(var(--muted-foreground) / 0.35)" }}
                />
                {m.label}
              </button>
            ))}
          </div>
          <div className="flex items-center bg-accent/50 rounded-xl p-0.5 ring-1 ring-border/60">
            {ranges.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                  range === r ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      <AnimatedChartPlot>
      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
          <defs>
            {metrics.map((m) => (
              <linearGradient key={m.key} id={`area-${m.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={m.color} stopOpacity={0.22} />
                <stop offset="100%" stopColor={m.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis
            yAxisId="money"
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
            hide={!activeMetrics.has("spend") && !activeMetrics.has("revenue")}
          />
          <YAxis
            yAxisId="conv"
            orientation="right"
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => v.toLocaleString()}
            hide={!activeMetrics.has("conversions")}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }} />
          {metrics.map((m) => {
            if (!activeMetrics.has(m.key)) return null;
            const axis = m.key === "conversions" ? "conv" : "money";
            return (
              <Area
                key={`a-${m.key}`}
                yAxisId={axis}
                type="monotone"
                dataKey={m.key}
                name={m.label}
                stroke="transparent"
                fill={`url(#area-${m.key})`}
                fillOpacity={1}
                animationDuration={1300}
                animationBegin={metrics.findIndex((x) => x.key === m.key) * 150}
                isAnimationActive
              />
            );
          })}
          {metrics.map((m) => {
            if (!activeMetrics.has(m.key)) return null;
            const axis = m.key === "conversions" ? "conv" : "money";
            return (
              <Line
                key={`l-${m.key}`}
                yAxisId={axis}
                type="monotone"
                dataKey={m.key}
                name={m.label}
                stroke={m.color}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: m.color, fill: "hsl(var(--background))" }}
                animationDuration={1300}
                animationBegin={metrics.findIndex((x) => x.key === m.key) * 150 + 100}
                isAnimationActive
              />
            );
          })}
          <Brush
            dataKey="label"
            height={28}
            stroke="hsl(var(--border))"
            fill="hsl(var(--muted) / 0.35)"
            travellerWidth={8}
            tickFormatter={() => ""}
          />
        </ComposedChart>
      </ResponsiveContainer>
      </AnimatedChartPlot>
    </AnimatedChartBox>
  );
}
