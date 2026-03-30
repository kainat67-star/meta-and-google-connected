import { AnimatedChartBox, AnimatedChartPlot, chartEase, chartInViewOptions } from "@/components/AnimatedChartShell";
import { motion } from "framer-motion";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const hours = ["6am", "9am", "12pm", "3pm", "6pm", "9pm"];

function stableNoise(di: number, hi: number) {
  const s = Math.sin(di * 12.9898 + hi * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

const heatmapData = days.flatMap((day, di) =>
  hours.map((hour, hi) => ({
    day,
    hour,
    x: hi,
    y: di,
    value: Math.round(40 + Math.sin(di * 0.9 + hi * 0.5) * 30 + Math.cos(hi * 1.2) * 20 + stableNoise(di, hi) * 15),
  })),
);

const maxVal = Math.max(...heatmapData.map((d) => d.value));

function getColor(val: number) {
  const ratio = val / maxVal;
  if (ratio > 0.75) return "hsl(160 84% 39%)";
  if (ratio > 0.5) return "hsl(160 60% 30%)";
  if (ratio > 0.25) return "hsl(160 40% 20%)";
  return "hsl(240 4% 14%)";
}

export function ConversionHeatmap() {
  return (
    <AnimatedChartBox className="glass-card p-6">
      <div className="chart-header">
        <div>
          <h3 className="chart-title">Conversion Heatmap</h3>
          <p className="chart-subtitle">Conversion volume by weekday and time block</p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span>Low</span>
          <div className="flex gap-0.5">
            {["hsl(240 4% 14%)", "hsl(160 40% 20%)", "hsl(160 60% 30%)", "hsl(160 84% 39%)"].map((c, i) => (
              <div key={i} className="w-4 h-3 rounded-sm" style={{ backgroundColor: c }} />
            ))}
          </div>
          <span>High</span>
        </div>
      </div>

      <AnimatedChartPlot staggerAfterBox={0.42}>
      <div className="overflow-x-auto">
        <div className="min-w-[360px]">
          {/* Header row */}
          <div className="flex items-center mb-1.5">
            <div className="w-10" />
            {hours.map((h) => (
              <div key={h} className="flex-1 text-center text-[10px] text-muted-foreground font-medium">{h}</div>
            ))}
          </div>

          {/* Grid */}
          {days.map((day, di) => (
            <div key={day} className="flex items-center gap-1 mb-1">
              <div className="w-10 text-[11px] text-muted-foreground font-medium">{day}</div>
              {hours.map((_, hi) => {
                const cell = heatmapData.find((d) => d.x === hi && d.y === di)!;
                return (
                  <motion.div
                    key={`${day}-${hi}`}
                    initial={{ opacity: 0, scale: 0.55 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ ...chartInViewOptions, amount: 0.15 }}
                    transition={{
                      duration: 0.55,
                      delay: 0.55 + (di * 6 + hi) * 0.022,
                      ease: chartEase,
                    }}
                    className="flex-1 aspect-[2/1] rounded-md relative group cursor-pointer transition-all hover:scale-105"
                    style={{ backgroundColor: getColor(cell.value) }}
                  >
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded-md bg-card border border-border text-[10px] text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                      {cell.value} conversions
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      </AnimatedChartPlot>
    </AnimatedChartBox>
  );
}
