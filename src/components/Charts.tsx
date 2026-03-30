import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { AnimatedChartBox, AnimatedChartPlot } from "@/components/AnimatedChartShell";

const spendData = [
  { name: "Jan", google: 4200, meta: 3800, tiktok: 2400, snap: 1200, x: 800 },
  { name: "Feb", google: 4800, meta: 4200, tiktok: 2800, snap: 1400, x: 900 },
  { name: "Mar", google: 5200, meta: 3600, tiktok: 3200, snap: 1600, x: 1100 },
  { name: "Apr", google: 4900, meta: 4800, tiktok: 3600, snap: 1800, x: 1300 },
  { name: "May", google: 5600, meta: 5200, tiktok: 4200, snap: 2000, x: 1500 },
  { name: "Jun", google: 6100, meta: 5800, tiktok: 4800, snap: 2200, x: 1700 },
  { name: "Jul", google: 5800, meta: 6200, tiktok: 5200, snap: 2400, x: 1900 },
];

const channelData = [
  { name: "Google", spend: 36600, conversions: 4820, roas: 4.2 },
  { name: "Meta", spend: 33600, conversions: 4100, roas: 3.8 },
  { name: "TikTok", spend: 26200, conversions: 3200, roas: 3.1 },
  { name: "Snap", spend: 12600, conversions: 1580, roas: 2.9 },
  { name: "X", spend: 9200, conversions: 980, roas: 2.4 },
];

const pieData = [
  { name: "Google", value: 31, color: "#4285f4" },
  { name: "Meta", value: 28, color: "#1877f2" },
  { name: "TikTok", value: 22, color: "#fe2c55" },
  { name: "Snap", value: 11, color: "#FFFC00" },
  { name: "X", value: 8, color: "#71717a" },
];

const gridStroke = "hsl(240 4% 14%)";
const axisStroke = "hsl(240 3% 35%)";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="glass-card p-3.5 !rounded-xl text-xs border border-border shadow-2xl" style={{ background: "hsl(240 5% 10% / 0.95)", backdropFilter: "blur(16px)" }}>
      <p className="text-foreground font-semibold mb-1.5 text-[11px] tracking-wide uppercase">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 py-0.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground capitalize">{p.dataKey}</span>
          <span className="text-foreground font-medium ml-auto">${p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

const chartCard = "glass-card p-6";

export function SpendOverTimeChart() {
  return (
    <AnimatedChartBox className={chartCard}>
      <div className="chart-header">
        <div>
          <h3 className="chart-title">Ad Spend Over Time</h3>
          <p className="chart-subtitle">Monthly platform spend comparison</p>
        </div>
        <div className="flex gap-3">
          {[{ label: "Google", color: "#4285f4" }, { label: "Meta", color: "#1877f2" }, { label: "TikTok", color: "#fe2c55" }].map(l => (
            <div key={l.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
              {l.label}
            </div>
          ))}
        </div>
      </div>
      <AnimatedChartPlot>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={spendData}>
          <defs>
            <linearGradient id="gGoogle" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4285f4" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#4285f4" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gMeta" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1877f2" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#1877f2" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gTiktok" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fe2c55" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#fe2c55" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
          <XAxis dataKey="name" stroke={axisStroke} fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke={axisStroke} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="google"
            stroke="#4285f4"
            fill="url(#gGoogle)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
            isAnimationActive
            animationBegin={400}
            animationDuration={1400}
          />
          <Area
            type="monotone"
            dataKey="meta"
            stroke="#1877f2"
            fill="url(#gMeta)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
            isAnimationActive
            animationBegin={520}
            animationDuration={1400}
          />
          <Area
            type="monotone"
            dataKey="tiktok"
            stroke="#fe2c55"
            fill="url(#gTiktok)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
            isAnimationActive
            animationBegin={640}
            animationDuration={1400}
          />
        </AreaChart>
      </ResponsiveContainer>
      </AnimatedChartPlot>
    </AnimatedChartBox>
  );
}

export function ChannelBarChart() {
  return (
    <AnimatedChartBox className={chartCard}>
      <div className="chart-header">
        <div>
          <h3 className="chart-title">ROAS by Channel</h3>
          <p className="chart-subtitle">Return on ad spend per platform</p>
        </div>
      </div>
      <AnimatedChartPlot>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={channelData} barSize={32}>
          <defs>
            <linearGradient id="roasGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(160 84% 45%)" stopOpacity={1} />
              <stop offset="100%" stopColor="hsl(160 84% 30%)" stopOpacity={0.7} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
          <XAxis dataKey="name" stroke={axisStroke} fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke={axisStroke} fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="roas"
            fill="url(#roasGrad)"
            radius={[8, 8, 0, 0]}
            isAnimationActive
            animationBegin={450}
            animationDuration={1200}
          />
        </BarChart>
      </ResponsiveContainer>
      </AnimatedChartPlot>
    </AnimatedChartBox>
  );
}

export function SpendDistributionPie() {
  return (
    <AnimatedChartBox className={chartCard}>
      <div className="chart-header">
        <div>
          <h3 className="chart-title">Spend Distribution</h3>
          <p className="chart-subtitle">Budget allocation by platform</p>
        </div>
      </div>
      <AnimatedChartPlot>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={105}
              paddingAngle={3}
              dataKey="value"
              isAnimationActive
              animationBegin={480}
              animationDuration={1200}
            >
              {pieData.map((entry, index) => (
                <Cell key={index} fill={entry.color} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 justify-center">
          {pieData.map((d) => (
            <div key={d.name} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <div className="w-2.5 h-2.5 rounded-[4px]" style={{ backgroundColor: d.color }} />
              <span className="font-medium">{d.name}</span>
              <span className="text-muted-foreground/50">{d.value}%</span>
            </div>
          ))}
        </div>
      </AnimatedChartPlot>
    </AnimatedChartBox>
  );
}

export function ChartSkeleton({ height = 380 }: { height?: number }) {
  return <div className="skeleton" style={{ height }} />;
}

export { channelData };
