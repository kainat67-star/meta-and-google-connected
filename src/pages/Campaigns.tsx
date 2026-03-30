import { chartEase, chartInViewOptions } from "@/components/AnimatedChartShell";
import { DashboardLayout } from "@/components/DashboardLayout";
import { platformColorByLabel } from "@/lib/platforms";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  MoreHorizontal,
  Pencil,
  Lightbulb,
  Copy,
  Pause,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PlatformLabel = "Google Ads" | "Meta Ads" | "TikTok Ads" | "Snapchat Ads" | "X Ads";
type Status = "Active" | "Paused" | "Ended";

interface Campaign {
  id: number;
  name: string;
  platform: PlatformLabel;
  dailyBudget: number;
  spend: number;
  conversions: number;
  costPerResult: number;
  roas: number;
  ctr: number;
  status: Status;
  trend: number;
  sparkline: number[];
  impressions: number;
  clicks: number;
  cpc: number;
}

const initialCampaigns: Campaign[] = [
  { id: 1, name: "Summer Sale 2024", platform: "Google Ads", dailyBudget: 500, spend: 412, conversions: 1680, costPerResult: 7.38, roas: 4.8, ctr: 3.7, status: "Active", trend: 12, sparkline: [120, 140, 135, 160, 155, 170, 168], impressions: 842000, clicks: 31200, cpc: 0.4 },
  { id: 2, name: "Brand Awareness Q3", platform: "Meta Ads", dailyBudget: 350, spend: 280, conversions: 1490, costPerResult: 6.17, roas: 3.2, ctr: 2.9, status: "Active", trend: 8, sparkline: [100, 110, 108, 125, 130, 140, 149], impressions: 1250000, clicks: 36250, cpc: 0.25 },
  { id: 3, name: "App Install Drive", platform: "TikTok Ads", dailyBudget: 300, spend: 300, conversions: 2540, costPerResult: 3.07, roas: 2.9, ctr: 4.2, status: "Paused", trend: -5, sparkline: [280, 270, 265, 260, 258, 255, 254], impressions: 1680000, clicks: 70560, cpc: 0.11 },
  { id: 4, name: "Retargeting Flow", platform: "Meta Ads", dailyBudget: 200, spend: 178, conversions: 890, costPerResult: 6.29, roas: 5.1, ctr: 4.0, status: "Active", trend: 18, sparkline: [60, 68, 72, 78, 82, 86, 89], impressions: 320000, clicks: 12800, cpc: 0.44 },
  { id: 5, name: "Holiday Prep", platform: "Google Ads", dailyBudget: 400, spend: 400, conversions: 720, costPerResult: 5.97, roas: 3.7, ctr: 3.3, status: "Ended", trend: 0, sparkline: [70, 72, 72, 72, 72, 72, 72], impressions: 560000, clicks: 18480, cpc: 0.23 },
  { id: 6, name: "Gen Z Outreach", platform: "TikTok Ads", dailyBudget: 250, spend: 195, conversions: 1850, costPerResult: 3.35, roas: 2.6, ctr: 4.4, status: "Active", trend: 22, sparkline: [120, 135, 150, 160, 170, 180, 185], impressions: 2100000, clicks: 92400, cpc: 0.07 },
  { id: 7, name: "Story Takeover", platform: "Snapchat Ads", dailyBudget: 180, spend: 142, conversions: 540, costPerResult: 7.04, roas: 2.9, ctr: 2.1, status: "Active", trend: -3, sparkline: [58, 56, 55, 54, 55, 54, 54], impressions: 890000, clicks: 18690, cpc: 0.2 },
  { id: 8, name: "Promoted Tweets Q3", platform: "X Ads", dailyBudget: 150, spend: 150, conversions: 280, costPerResult: 10.36, roas: 2.4, ctr: 1.8, status: "Ended", trend: -15, sparkline: [40, 38, 35, 32, 30, 29, 28], impressions: 420000, clicks: 7560, cpc: 0.38 },
  { id: 9, name: "Lookalike Scale", platform: "Meta Ads", dailyBudget: 600, spend: 320, conversions: 2100, costPerResult: 2.67, roas: 4.2, ctr: 3.8, status: "Active", trend: 14, sparkline: [160, 170, 180, 190, 195, 205, 210], impressions: 1800000, clicks: 68400, cpc: 0.15 },
  { id: 10, name: "Video Views Push", platform: "TikTok Ads", dailyBudget: 220, spend: 110, conversions: 960, costPerResult: 4.58, roas: 3.0, ctr: 3.5, status: "Paused", trend: -8, sparkline: [110, 105, 100, 98, 97, 96, 96], impressions: 1400000, clicks: 49000, cpc: 0.09 },
];

const PLATFORMS = ["All", "Google Ads", "Meta Ads", "TikTok Ads", "Snapchat Ads", "X Ads"] as const;
const DATE_RANGES = ["Last 7 days", "Last 30 days", "Last 90 days"] as const;
const PAGE_SIZE = 7;

type SortKey =
  | "name"
  | "platform"
  | "status"
  | "dailyBudget"
  | "spend"
  | "conversions"
  | "costPerResult"
  | "roas"
  | "ctr"
  | "trend";

function PlatformBadge({ platform }: { platform: PlatformLabel }) {
  const color = platformColorByLabel[platform] ?? "#888";
  const short = platform.replace(" Ads", "");
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-md border border-border/80 bg-accent/30"
      style={{ borderColor: `${color}44` }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      {short}
    </span>
  );
}

const Campaigns = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [platformFilter, setPlatformFilter] = useState<string>("All");
  const [dateRange, setDateRange] = useState<(typeof DATE_RANGES)[number]>("Last 30 days");
  const [campaigns] = useState<Campaign[]>(initialCampaigns);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("spend");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return campaigns
      .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
      .filter((c) => statusFilter === "All" || c.status === statusFilter)
      .filter((c) => platformFilter === "All" || c.platform === platformFilter)
      .sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (typeof av === "string" && typeof bv === "string") {
          return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
        }
        const an = Number(av);
        const bn = Number(bv);
        return sortAsc ? an - bn : bn - an;
      });
  }, [campaigns, search, statusFilter, platformFilter, sortKey, sortAsc]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageData = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(key === "name" || key === "platform" || key === "status");
    }
  };

  const SortIcon = ({ field }: { field: SortKey }) => (
    <span className={cn("ml-0.5 inline-flex", sortKey === field && "text-primary")}>
      {sortKey === field ? (
        sortAsc ? (
          <ArrowUp className="w-3 h-3" />
        ) : (
          <ArrowDown className="w-3 h-3" />
        )
      ) : (
        <ChevronDown className="w-3 h-3 opacity-35" />
      )}
    </span>
  );

  const runAction = (label: string, campaign: string) => {
    toast.success(label, { description: campaign });
  };

  const COL_COUNT = 12;

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col xl:flex-row flex-wrap gap-3 mb-6"
      >
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-accent/30 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
          />
        </div>

        <Select
          value={platformFilter}
          onValueChange={(v) => {
            setPlatformFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full xl:w-[200px] rounded-xl h-11 bg-accent/30 border-border">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            {PLATFORMS.map((p) => (
              <SelectItem key={p} value={p}>
                {p === "All" ? "All platforms" : p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full xl:w-[180px] rounded-xl h-11 bg-accent/30 border-border">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {["All", "Active", "Paused", "Ended"].map((s) => (
              <SelectItem key={s} value={s}>
                {s === "All" ? "All statuses" : s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={dateRange} onValueChange={(v) => setDateRange(v as (typeof DATE_RANGES)[number])}>
          <SelectTrigger className="w-full xl:w-[200px] rounded-xl h-11 bg-accent/30 border-border">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGES.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="glass-card overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1100px]">
            <thead className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur-md">
              <tr>
                <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-10" />
                <th
                  className="text-left px-4 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground"
                  onClick={() => toggleSort("name")}
                >
                  Campaign <SortIcon field="name" />
                </th>
                <th
                  className="text-left px-4 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground"
                  onClick={() => toggleSort("platform")}
                >
                  Platform <SortIcon field="platform" />
                </th>
                <th
                  className="text-left px-4 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground"
                  onClick={() => toggleSort("status")}
                >
                  Status <SortIcon field="status" />
                </th>
                <th
                  className="text-left px-4 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground tabular-nums"
                  onClick={() => toggleSort("dailyBudget")}
                >
                  Daily budget <SortIcon field="dailyBudget" />
                </th>
                <th
                  className="text-left px-4 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground"
                  onClick={() => toggleSort("spend")}
                >
                  Spend <SortIcon field="spend" />
                </th>
                <th
                  className="text-left px-4 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground"
                  onClick={() => toggleSort("conversions")}
                >
                  Conversions <SortIcon field="conversions" />
                </th>
                <th
                  className="text-left px-4 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground"
                  onClick={() => toggleSort("costPerResult")}
                >
                  Cost / result <SortIcon field="costPerResult" />
                </th>
                <th
                  className="text-left px-4 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground"
                  onClick={() => toggleSort("roas")}
                >
                  ROAS <SortIcon field="roas" />
                </th>
                <th
                  className="text-left px-4 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground"
                  onClick={() => toggleSort("ctr")}
                >
                  CTR <SortIcon field="ctr" />
                </th>
                <th
                  className="text-left px-4 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground"
                  onClick={() => toggleSort("trend")}
                >
                  Trend <SortIcon field="trend" />
                </th>
                <th className="text-right px-4 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-12">
                  {""}
                </th>
              </tr>
            </thead>
            <tbody>
              {pageData.map((c, i) => {
                const budgetPct = Math.min(100, Math.round((c.spend / c.dailyBudget) * 100));
                const barColor =
                  budgetPct >= 95 ? "bg-red-500" : budgetPct >= 75 ? "bg-amber-500" : "bg-emerald-500";
                const expanded = expandedRow === c.id;
                const sparkData = c.sparkline.map((v, idx) => ({ v, i: idx }));

                return (
                  <Fragment key={c.id}>
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.04 + i * 0.02 }}
                      className={cn(
                        "border-b border-border/40 transition-colors cursor-pointer group",
                        expanded ? "bg-accent/25" : "hover:bg-accent/15",
                      )}
                      onClick={() => setExpandedRow(expanded ? null : c.id)}
                    >
                      <td className="px-4 py-3 align-middle">
                        <ChevronRight
                          className={cn(
                            "w-4 h-4 text-muted-foreground transition-transform duration-200",
                            expanded && "rotate-90 text-primary",
                          )}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground text-[13px] leading-tight">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{dateRange}</p>
                      </td>
                      <td className="px-4 py-3">
                        <PlatformBadge platform={c.platform} />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "text-[11px] px-2 py-1 rounded-lg font-medium border",
                            c.status === "Active" && "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
                            c.status === "Paused" && "bg-amber-500/10 text-amber-400 border-amber-500/25",
                            c.status === "Ended" && "bg-muted text-muted-foreground border-border",
                          )}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-foreground font-medium">${c.dailyBudget.toLocaleString()}</td>
                      <td className="px-4 py-3 min-w-[140px]">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs gap-2">
                            <span className="text-foreground font-semibold">${c.spend.toLocaleString()}</span>
                            <span className="text-muted-foreground">{budgetPct}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${budgetPct}%` }}
                              transition={{ duration: 0.6, delay: 0.1 + i * 0.03 }}
                              className={cn("h-full rounded-full", barColor)}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums font-semibold text-foreground">{c.conversions.toLocaleString()}</td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">${c.costPerResult.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-primary/10 text-primary">{c.roas}x</span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">{c.ctr.toFixed(2)}%</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <motion.div
                            className="w-14 h-7 shrink-0"
                            initial={{ opacity: 0, scale: 0.85 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={chartInViewOptions}
                            transition={{ duration: 0.75, delay: i * 0.05, ease: chartEase }}
                          >
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={sparkData}>
                                <Line
                                  type="monotone"
                                  dataKey="v"
                                  stroke={c.trend >= 0 ? "#10b981" : "#ef4444"}
                                  strokeWidth={1.5}
                                  dot={false}
                                  isAnimationActive
                                  animationBegin={280}
                                  animationDuration={1100}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </motion.div>
                          <span
                            className={cn(
                              "inline-flex items-center gap-0.5 text-[11px] font-bold tabular-nums",
                              c.trend > 0 && "text-emerald-400",
                              c.trend < 0 && "text-red-400",
                              c.trend === 0 && "text-muted-foreground",
                            )}
                          >
                            {c.trend > 0 ? <ArrowUp className="w-3 h-3" /> : c.trend < 0 ? <ArrowDown className="w-3 h-3" /> : null}
                            {c.trend === 0 ? "—" : `${Math.abs(c.trend)}%`}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-70 group-hover:opacity-100 transition-opacity"
                              aria-label="Open actions"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onSelect={() => runAction("Edit Campaign", c.name)}
                              className="gap-2 text-xs"
                            >
                              <Pencil className="w-3.5 h-3.5" /> Edit Campaign
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => runAction("Campaign paused", c.name)}
                              className="gap-2 text-xs"
                            >
                              <Pause className="w-3.5 h-3.5" /> Pause Campaign
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => runAction("Opening insights", c.name)}
                              className="gap-2 text-xs"
                            >
                              <Lightbulb className="w-3.5 h-3.5" /> View Insights
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={() => runAction("Campaign duplicated", c.name)}
                              className="gap-2 text-xs"
                            >
                              <Copy className="w-3.5 h-3.5" /> Duplicate Campaign
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </motion.tr>
                    {expanded && (
                      <tr className="border-b border-border/40 bg-accent/10">
                        <td colSpan={COL_COUNT} className="p-0">
                          <AnimatePresence mode="wait">
                            <motion.div
                              key="detail"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.22 }}
                              className="overflow-hidden"
                            >
                              <div className="px-8 py-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                                {[
                                  { label: "Impressions", value: `${(c.impressions / 1000).toFixed(0)}K` },
                                  { label: "Clicks", value: `${(c.clicks / 1000).toFixed(1)}K` },
                                  { label: "CPC", value: `$${c.cpc.toFixed(2)}` },
                                  { label: "CTR", value: `${c.ctr}%` },
                                  { label: "ROAS", value: `${c.roas}x` },
                                  { label: "Cost / result", value: `$${c.costPerResult.toFixed(2)}` },
                                ].map((m) => (
                                  <div key={m.label}>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">{m.label}</p>
                                    <p className="text-sm font-bold text-foreground tabular-nums">{m.value}</p>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          </AnimatePresence>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={COL_COUNT} className="px-6 py-20 text-center">
                    <div className="max-w-sm mx-auto">
                      <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                        <Search className="w-7 h-7 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">No campaigns match your filters</p>
                      <p className="text-xs text-muted-foreground mt-1">Try clearing search or widening platform and status filters.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border/60 bg-accent/10">
            <p className="text-[11px] text-muted-foreground">
              Showing{" "}
              <span className="text-foreground font-medium">
                {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)}
              </span>{" "}
              of <span className="text-foreground font-medium">{filtered.length}</span> campaigns
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-lg text-xs"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground tabular-nums px-2">
                {currentPage} / {pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-lg text-xs"
                disabled={currentPage >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </DashboardLayout>
  );
};

export default Campaigns;
