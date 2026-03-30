import { motion, useInView } from "framer-motion";
import { createContext, useContext, useRef, type ReactNode } from "react";

/** Shared easing for dashboard chart entrances */
export const chartEase = [0.22, 1, 0.36, 1] as const;

/** Scroll: animate when this much of the element is visible (lower = earlier trigger). */
export const chartInViewOptions = {
  once: true,
  amount: 0.12,
  margin: "0px 0px -8% 0px",
} as const;

/**
 * `true` / `false` from parent `AnimatedChartBox`; `null` if no provider (plot uses its own `useInView`).
 */
const ChartScrollContext = createContext<boolean | null>(null);

type BoxProps = {
  /** Extra delay before the shell animation starts (seconds), rarely needed. */
  delay?: number;
  className?: string;
  children: ReactNode;
};

/**
 * Outer glass card: one `useInView` on the card — shell fades/lifts/scales when the card
 * scrolls into view; children can read the same visibility via context.
 */
export function AnimatedChartBox({ delay = 0, className, children }: BoxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, chartInViewOptions);

  return (
    <div ref={ref} className={className}>
      <ChartScrollContext.Provider value={isInView}>
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={
            isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 40, scale: 0.96 }
          }
          transition={{ duration: 0.92, delay, ease: chartEase }}
        >
          {children}
        </motion.div>
      </ChartScrollContext.Provider>
    </div>
  );
}

type PlotProps = {
  /**
   * Seconds after the card becomes visible before the plot animation starts
   * (stage 2 — matches heatmap: box first, then chart region).
   */
  staggerAfterBox?: number;
  className?: string;
  children: ReactNode;
};

/**
 * Inner plot region: uses the same scroll signal as `AnimatedChartBox` (context), not a
 * second `whileInView`, so it always runs after the shell when you scroll the card in.
 */
export function AnimatedChartPlot({ staggerAfterBox = 0.38, className, children }: PlotProps) {
  const parentInView = useContext(ChartScrollContext);
  const ref = useRef<HTMLDivElement>(null);
  const localInView = useInView(ref, chartInViewOptions);
  const isInView = parentInView !== null ? parentInView : localInView;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.93 }}
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.93 }}
      transition={{ duration: 0.88, delay: staggerAfterBox, ease: chartEase }}
      className={className ?? "w-full min-w-0"}
    >
      {children}
    </motion.div>
  );
}
