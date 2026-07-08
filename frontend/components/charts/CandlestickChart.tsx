"use client";

import { useEffect, useRef } from "react";
import { CandlestickSeries, createChart, CandlestickData } from "lightweight-charts";

const candlestickData: CandlestickData[] = [
  { time: "2024-06-01", open: 1.0650, high: 1.0685, low: 1.0615, close: 1.0668 },
  { time: "2024-06-02", open: 1.0668, high: 1.0703, low: 1.0640, close: 1.0691 },
  { time: "2024-06-03", open: 1.0691, high: 1.0720, low: 1.0665, close: 1.0682 },
  { time: "2024-06-04", open: 1.0682, high: 1.0725, low: 1.0670, close: 1.0716 },
  { time: "2024-06-05", open: 1.0716, high: 1.0741, low: 1.0693, close: 1.0720 },
  { time: "2024-06-06", open: 1.0720, high: 1.0753, low: 1.0710, close: 1.0737 },
  { time: "2024-06-07", open: 1.0737, high: 1.0750, low: 1.0705, close: 1.0712 },
  { time: "2024-06-08", open: 1.0712, high: 1.0738, low: 1.0699, close: 1.0726 },
  { time: "2024-06-09", open: 1.0726, high: 1.0750, low: 1.0711, close: 1.0743 },
  { time: "2024-06-10", open: 1.0743, high: 1.0768, low: 1.0730, close: 1.0761 },
];

export default function CandlestickChart() {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const chartInstance = useRef<ReturnType<typeof createChart> | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (chartInstance.current) {
      chartInstance.current.remove();
    }

    chartInstance.current = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: 320,
      layout: {
        background: { color: "transparent" },
        textColor: "#cbd5e1",
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.04)" },
        horzLines: { color: "rgba(255, 255, 255, 0.05)" },
      },
      rightPriceScale: {
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
      },
      crosshair: {
        vertLine: { color: "rgba(59, 130, 246, 0.24)" },
        horzLine: { color: "rgba(59, 130, 246, 0.24)" },
      },
      localization: {
        priceFormatter: (price: number) => price.toFixed(4),
      },
    });

    const candleSeries = chartInstance.current.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderDownColor: "#ef4444",
      borderUpColor: "#22c55e",
      wickDownColor: "#fca5a5",
      wickUpColor: "#86efac",
    });

    candleSeries.setData(candlestickData);

    const handleResize = () => {
      chartInstance.current?.applyOptions({
        width: chartRef.current?.clientWidth ?? 0,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chartInstance.current?.remove();
    };
  }, []);

  return <div ref={chartRef} className="h-[320px] w-full rounded-lg bg-[#07090d]/70" />;
}
