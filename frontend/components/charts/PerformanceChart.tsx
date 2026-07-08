"use client";

import { useEffect, useRef } from "react";
import { createChart, LineSeries } from "lightweight-charts";

const chartData = [
  { time: "2025-05-01", value: 0 },
  { time: "2025-05-03", value: 5.4 },
  { time: "2025-05-05", value: 3.1 },
  { time: "2025-05-07", value: 7.8 },
  { time: "2025-05-09", value: 5.2 },
  { time: "2025-05-11", value: 9.6 },
  { time: "2025-05-13", value: 7.4 },
  { time: "2025-05-15", value: 11.2 },
  { time: "2025-05-17", value: 9.0 },
  { time: "2025-05-19", value: 13.5 },
  { time: "2025-05-21", value: 11.8 },
  { time: "2025-05-23", value: -2.1 },
  { time: "2025-05-25", value: 14.7 },
  { time: "2025-05-27", value: 16.2 },
  { time: "2025-05-29", value: 18.7 },
];

type Props = {
  height?: number;
};

export default function PerformanceChart({ height = 200 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      width: el.clientWidth,
      height,
      layout: {
        background: { color: "transparent" },
        textColor: "#64748b",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.03)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.05)",
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.05)",
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      crosshair: { mode: 1 },
    });

    const line = chart.addSeries(LineSeries, {
      color: "#3b82f6",
      lineWidth: 2,
      priceLineVisible: false,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
    });
    line.setData(chartData);
    chart.timeScale().fitContent();

    const onResize = () => {
      if (el) chart.applyOptions({ width: el.clientWidth });
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
    };
  }, [height]);

  return <div ref={containerRef} className="w-full" style={{ height }} />;
}
