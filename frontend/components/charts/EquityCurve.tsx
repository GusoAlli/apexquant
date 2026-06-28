"use client";

import { useEffect, useRef } from "react";
import { createChart, LineSeries, type IChartApi, type LineData } from "lightweight-charts";

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
        background: { color: "#0f172a" },
        textColor: "#cbd5e1",
      },
      grid: {
        vertLines: { color: "rgba(148, 163, 184, 0.15)" },
        horzLines: { color: "rgba(148, 163, 184, 0.1)" },
      },
      rightPriceScale: { borderColor: "rgba(148, 163, 184, 0.15)" },
      timeScale: { borderColor: "rgba(148, 163, 184, 0.15)" },
      crosshair: { mode: 1 },
      localization: { dateFormat: "dd MMM" },
    });

    const lineSeries = chart.addSeries(LineSeries, {
      color: "#fbbf24",
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
    <div className="rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-[0_16px_50px_-35px_rgba(0,0,0,0.8)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Performance Overview</p>
          <p className="mt-2 text-xs text-slate-500">This month</p>
        </div>
        <button className="rounded-2xl bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10">
          View
        </button>
      </div>
      <div ref={chartContainerRef} className="mt-6 h-[320px] w-full" />
      <div className="mt-4 grid grid-cols-3 gap-4 text-xs text-slate-400">
        <span>01 May</span>
        <span>15 May</span>
        <span>28 May</span>
      </div>
    </div>
  );
}
