import { DashboardLayout } from "@/components/DashboardLayout";
import { MetricCard, MetricCardSkeleton } from "@/components/MetricCard";
import { AnimatedChartBox, AnimatedChartPlot, chartEase, chartInViewOptions } from "@/components/AnimatedChartShell";
import { SpendOverTimeChart, ChannelBarChart, SpendDistributionPie, ChartSkeleton } from "@/components/Charts";
import { PerformanceTimeline } from "@/components/PerformanceTimeline";
import { ActivityFeed } from "@/components/ActivityFeed";
import { ConversionHeatmap } from "@/components/ConversionHeatmap";
import { DollarSign, Users, TrendingUp, Eye, Target, BarChart3, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

/** Order: revenue & efficiency first, then volume and cost metrics, then engagement. */
const kpis = [
  { title: "Revenue", value: "$401.9K", change: 15.3, icon: TrendingUp, spark: [310, 330, 348, 365, 378, 392, 402] },
  { title: "ROAS", value: "3.4x", change: 4.7, icon: BarChart3, spark: [3.0, 3.1, 3.15, 3.2, 3.28, 3.35, 3.4] },
  { title: "Conversions", value: "14,680", change: 8.2, icon: Users, spark: [12100, 12800, 13200, 13600, 14000, 14300, 14680] },
  { title: "Total Spend", value: "$118.2K", change: 12.5, icon: DollarSign, spark: [92, 96, 100, 105, 110, 114, 118] },
  {
    title: "Cost Per Acquisition",
    value: "$18.40",
    change: -5.3,
    icon: Target,
    spark: [22, 20, 21, 19, 18.8, 18.5, 18.4],
  },
  { title: "CTR", value: "3.42%", change: -2.1, icon: Eye, spark: [3.6, 3.55, 3.5, 3.48, 3.45, 3.44, 3.42] },
];

const topCampaigns = [
  { name: "Summer Sale 2024", channel: "Google", spend: "$12,400", roas: "4.8x", status: "Active" as const },
  { name: "Brand Awareness Q3", channel: "Meta", spend: "$9,200", roas: "3.2x", status: "Active" as const },
  { name: "App Install Drive", channel: "TikTok", spend: "$7,800", roas: "2.9x", status: "Paused" as const },
  { name: "Retargeting Flow", channel: "Meta", spend: "$5,600", roas: "5.1x", status: "Active" as const },
  { name: "Holiday Prep", channel: "Google", spend: "$4,300", roas: "3.7x", status: "Draft" as const },
];

const statusStyles = {
  Active: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  Paused: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  Draft: "bg-muted text-muted-foreground border border-border",
};

const Dashboard = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 650);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-10">
        {/* 1. Executive KPIs — highest priority snapshot */}
        <section aria-labelledby="dash-kpis-heading">
          <h2 id="dash-kpis-heading" className="sr-only">
            Key performance indicators
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <MetricCardSkeleton key={i} />)
              : kpis.map((kpi, i) => (
                  <MetricCard
                    key={kpi.title}
                    title={kpi.title}
                    value={kpi.value}
                    change={kpi.change}
                    icon={kpi.icon}
                    sparkData={kpi.spark}
                    delay={i * 0.06}
                    invertTrend={kpi.title === "Cost Per Acquisition"}
                  />
                ))}
          </div>
        </section>

        {/* 2. Primary trend — spend, revenue, conversions over time */}
        <section aria-labelledby="dash-timeline-heading">
          <h2 id="dash-timeline-heading" className="sr-only">
            Performance timeline
          </h2>
          <div>{loading ? <ChartSkeleton height={420} /> : <PerformanceTimeline />}</div>
        </section>

        {/* 3. Channel-level performance — where spend goes and how each channel returns */}
        <section aria-labelledby="dash-channels-heading">
          <h2 id="dash-channels-heading" className="sr-only">
            Channel spend and return
          </h2>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {loading ? (
              <>
                <ChartSkeleton height={320} />
                <ChartSkeleton height={320} />
              </>
            ) : (
              <>
                <SpendOverTimeChart />
                <ChannelBarChart />
              </>
            )}
          </div>
        </section>

        {/* 4. Actionable ranking — best campaigns to focus on */}
        <section aria-labelledby="dash-top-campaigns-heading">
          <h2 id="dash-top-campaigns-heading" className="sr-only">
            Top campaigns
          </h2>
          <AnimatedChartBox className="glass-card-hover p-6">
            <div className="chart-header">
              <div>
                <h3 className="chart-title">Top campaigns</h3>
                <p className="chart-subtitle">Highest ROAS in the selected period</p>
              </div>
              <button
                type="button"
                className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors hover:gap-1.5"
              >
                View all <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <AnimatedChartPlot staggerAfterBox={0.4}>
            <div className="space-y-2">
              {topCampaigns.map((campaign, i) => (
                <motion.div
                  key={campaign.name}
                  initial={{ opacity: 0, x: -14 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={chartInViewOptions}
                  transition={{ duration: 0.82, delay: i * 0.08, ease: chartEase }}
                  className="flex items-center justify-between p-4 rounded-xl bg-accent/15 hover:bg-accent/30 transition-all duration-200 cursor-pointer group border border-transparent hover:border-border/60"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">{campaign.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{campaign.channel}</p>
                  </div>
                  <div className="text-right mx-5 hidden sm:block">
                    <p className="text-sm font-semibold text-foreground tabular-nums">{campaign.spend}</p>
                    <p className="text-[11px] metric-positive font-medium">{campaign.roas}</p>
                  </div>
                  <span className={`text-[11px] px-2.5 py-1 rounded-lg font-medium ${statusStyles[campaign.status]}`}>
                    {campaign.status}
                  </span>
                </motion.div>
              ))}
            </div>
            </AnimatedChartPlot>
          </AnimatedChartBox>
        </section>

        {/* 5. Supporting detail — allocation, timing patterns, recent activity */}
        <section aria-labelledby="dash-detail-heading">
          <h2 id="dash-detail-heading" className="sr-only">
            Allocation, timing, and activity
          </h2>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            {loading ? (
              <>
                <ChartSkeleton height={340} />
                <ChartSkeleton height={340} />
                <ChartSkeleton height={340} />
              </>
            ) : (
              <>
                <SpendDistributionPie />
                <ConversionHeatmap />
                <ActivityFeed />
              </>
            )}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
