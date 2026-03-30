import { chartEase, chartInViewOptions } from "@/components/AnimatedChartShell";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, AlertTriangle, Zap, Bell } from "lucide-react";

const activities = [
  { icon: TrendingUp, color: "text-primary", label: "Conversions up 18%", detail: "Google Ads · Summer Sale", time: "2m ago" },
  { icon: DollarSign, color: "text-warning", label: "Budget adjusted", detail: "Meta Ads · Lookalike Scale", time: "14m ago" },
  { icon: AlertTriangle, color: "text-danger", label: "CPA alert triggered", detail: "Google Ads · Summer Sale", time: "32m ago" },
  { icon: Zap, color: "text-primary", label: "AI insight generated", detail: "Shift budget to TikTok", time: "1h ago" },
  { icon: Bell, color: "text-muted-foreground", label: "Daily report ready", detail: "All platforms · July 15", time: "2h ago" },
  { icon: TrendingUp, color: "text-primary", label: "ROAS improved", detail: "Meta Ads · Retargeting Flow", time: "3h ago" },
];

export function ActivityFeed() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={chartInViewOptions}
      transition={{ duration: 0.92, ease: chartEase }}
      className="glass-card p-6"
    >
      <div className="chart-header">
        <div>
          <h3 className="chart-title">Recent Activity</h3>
          <p className="chart-subtitle">Real-time account updates</p>
        </div>
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
        </span>
      </div>

      <div className="space-y-0">
        {activities.map((a, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={chartInViewOptions}
            transition={{ duration: 0.75, delay: 0.35 + i * 0.07, ease: chartEase }}
            className="flex items-start gap-3 py-3 relative"
          >
            {/* Timeline line */}
            {i < activities.length - 1 && (
              <div className="absolute left-[13px] top-[36px] bottom-0 w-px bg-border/50" />
            )}
            <div className={`p-1.5 rounded-lg bg-accent shrink-0 relative z-10 ${a.color}`}>
              <a.icon className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground leading-tight">{a.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{a.detail}</p>
            </div>
            <span className="text-[10px] text-muted-foreground/60 shrink-0 tabular-nums">{a.time}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
