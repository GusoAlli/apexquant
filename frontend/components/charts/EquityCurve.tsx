"use client";

import { useEffect, useRef } from "react";
import { createChart, LineSeries, type IChartApi, type LineData } from "lightweight-charts";
import { PremiumCard, SectionHeader } from "@/components/ui/premium-card";

const seriesData: LineData[] = [
  { time: "2025-05-01", value: 10500 },
  { time: "2025-05-03", value: 11200 },
  { time: "2025-05-05", value: 11800 },
  { time: "2025-05-08", value: 12400 },
  { time: "2025-05-11", value: 11900 },
  { time: "2025-05-14", value: 12800 },
  { time: "2025-05-17", value: 13600 },
  { time: "2025-05-19", value: 14200 },
  { time: "2025-05-22", value: 15000 },
  { time: "2025-05-25", value: 16200 },
  { time: "2025-05-28", value: 16800 },
];

export default function EquityCurve() {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 320,
      layout: {
        background: { color: "transparent" },
        textColor: "#cbd5e1",
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.04)" },
        horzLines: { color: "rgba(255, 255, 255, 0.05)" },
      },
      rightPriceScale: { borderColor: "rgba(255, 255, 255, 0.06)" },
      timeScale: { borderColor: "rgba(255, 255, 255, 0.06)" },
      crosshair: { mode: 1 },
      localization: { dateFormat: "dd MMM" },
    });

    const lineSeries = chart.addSeries(LineSeries, {
      color: "#3B82F6",
      lineWidth: 3,
      priceLineVisible: false,
    });
    lineSeries.setData(seriesData);
    chartRef.current = chart;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, []);

  return (
    <PremiumCard className="p-5">
      <SectionHeader
        eyebrow="Performance"
        title="Large Equity Curve"
        description="Net exposure adjusted equity across all connected accounts."
        action={<span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs text-blue-300">This month</span>}
      />
      <div ref={chartContainerRef} className="mt-6 h-[320px] w-full rounded-lg bg-[#07090d]/70" />
      <div className="mt-4 grid grid-cols-3 gap-4 text-xs text-slate-400">
        <span>01 May</span>
        <span>15 May</span>
        <span>28 May</span>
      </div>
    </PremiumCard>
  );
}
