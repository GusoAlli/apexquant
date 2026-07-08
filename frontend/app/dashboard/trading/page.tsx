"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CandlestickSeries, HistogramSeries, LineSeries, createChart, type IChartApi } from "lightweight-charts";
import {
  Activity, ArrowDownRight, ArrowUpRight,
  Bot, CheckCircle2, ChevronDown, Loader2, Minus,
  MousePointer2, RefreshCw, Search, ShieldAlert,
  SlidersHorizontal, Square, TrendingDown, TrendingUp,
  Trash2, WifiOff, X, XCircle, Zap,
} from "lucide-react";
import { fetchWithAuth } from "@/lib/auth";
import { useMode } from "@/lib/useMode";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

// ── Symbol list (all major Binance USDT pairs) ────────────────────────────────

type SymbolEntry = { label: string; binance: string };
type SymbolGroup = { label: string; symbols: SymbolEntry[] };

const SYMBOL_GROUPS: SymbolGroup[] = [
  {
    label: "Large Cap",
    symbols: [
      { label: "BTC/USDT",   binance: "BTCUSDT"   },
      { label: "ETH/USDT",   binance: "ETHUSDT"   },
      { label: "BNB/USDT",   binance: "BNBUSDT"   },
      { label: "SOL/USDT",   binance: "SOLUSDT"   },
      { label: "XRP/USDT",   binance: "XRPUSDT"   },
      { label: "ADA/USDT",   binance: "ADAUSDT"   },
      { label: "AVAX/USDT",  binance: "AVAXUSDT"  },
      { label: "DOGE/USDT",  binance: "DOGEUSDT"  },
      { label: "TRX/USDT",   binance: "TRXUSDT"   },
      { label: "DOT/USDT",   binance: "DOTUSDT"   },
      { label: "LINK/USDT",  binance: "LINKUSDT"  },
      { label: "MATIC/USDT", binance: "MATICUSDT" },
      { label: "LTC/USDT",   binance: "LTCUSDT"   },
      { label: "SHIB/USDT",  binance: "SHIBUSDT"  },
      { label: "BCH/USDT",   binance: "BCHUSDT"   },
      { label: "UNI/USDT",   binance: "UNIUSDT"   },
      { label: "ATOM/USDT",  binance: "ATOMUSDT"  },
      { label: "ETC/USDT",   binance: "ETCUSDT"   },
      { label: "XLM/USDT",   binance: "XLMUSDT"   },
      { label: "XMR/USDT",   binance: "XMRUSDT"   },
    ],
  },
  {
    label: "Mid Cap",
    symbols: [
      { label: "APT/USDT",   binance: "APTUSDT"   },
      { label: "ARB/USDT",   binance: "ARBUSDT"   },
      { label: "OP/USDT",    binance: "OPUSDT"    },
      { label: "SUI/USDT",   binance: "SUIUSDT"   },
      { label: "INJ/USDT",   binance: "INJUSDT"   },
      { label: "NEAR/USDT",  binance: "NEARUSDT"  },
      { label: "FIL/USDT",   binance: "FILUSDT"   },
      { label: "HBAR/USDT",  binance: "HBARUSDT"  },
      { label: "VET/USDT",   binance: "VETUSDT"   },
      { label: "ICP/USDT",   binance: "ICPUSDT"   },
      { label: "MKR/USDT",   binance: "MKRUSDT"   },
      { label: "RUNE/USDT",  binance: "RUNEUSDT"  },
      { label: "FTM/USDT",   binance: "FTMUSDT"   },
      { label: "GRT/USDT",   binance: "GRTUSDT"   },
      { label: "ALGO/USDT",  binance: "ALGOUSDT"  },
      { label: "EGLD/USDT",  binance: "EGLDUSDT"  },
      { label: "STX/USDT",   binance: "STXUSDT"   },
      { label: "SEI/USDT",   binance: "SEIUSDT"   },
      { label: "TIA/USDT",   binance: "TIAUSDT"   },
      { label: "JUP/USDT",   binance: "JUPUSDT"   },
      { label: "PYTH/USDT",  binance: "PYTHUSDT"  },
      { label: "WLD/USDT",   binance: "WLDUSDT"   },
      { label: "BLUR/USDT",  binance: "BLURUSDT"  },
      { label: "CFX/USDT",   binance: "CFXUSDT"   },
      { label: "ONE/USDT",   binance: "ONEUSDT"   },
      { label: "ZEC/USDT",   binance: "ZECUSDT"   },
      { label: "DASH/USDT",  binance: "DASHUSDT"  },
      { label: "KAVA/USDT",  binance: "KAVAUSDT"  },
      { label: "ROSE/USDT",  binance: "ROSEUSDT"  },
    ],
  },
  {
    label: "DeFi",
    symbols: [
      { label: "AAVE/USDT",  binance: "AAVEUSDT"  },
      { label: "CRV/USDT",   binance: "CRVUSDT"   },
      { label: "SNX/USDT",   binance: "SNXUSDT"   },
      { label: "COMP/USDT",  binance: "COMPUSDT"  },
      { label: "1INCH/USDT", binance: "1INCHUSDT" },
      { label: "BAL/USDT",   binance: "BALUSDT"   },
      { label: "YFI/USDT",   binance: "YFIUSDT"   },
      { label: "SUSHI/USDT", binance: "SUSHIUSDT" },
      { label: "LDO/USDT",   binance: "LDOUSDT"   },
      { label: "DYDX/USDT",  binance: "DYDXUSDT"  },
      { label: "GMX/USDT",   binance: "GMXUSDT"   },
      { label: "CAKE/USDT",  binance: "CAKEUSDT"  },
      { label: "PENDLE/USDT",binance: "PENDLEUSDT"},
    ],
  },
  {
    label: "AI / Tech",
    symbols: [
      { label: "FET/USDT",   binance: "FETUSDT"   },
      { label: "RNDR/USDT",  binance: "RNDRUSDT"  },
      { label: "OCEAN/USDT", binance: "OCEANUSDT" },
      { label: "AGIX/USDT",  binance: "AGIXUSDT"  },
      { label: "NMR/USDT",   binance: "NMRUSDT"   },
      { label: "LPT/USDT",   binance: "LPTUSDT"   },
      { label: "CTXC/USDT",  binance: "CTXCUSDT"  },
    ],
  },
  {
    label: "Gaming / NFT",
    symbols: [
      { label: "SAND/USDT",  binance: "SANDUSDT"  },
      { label: "MANA/USDT",  binance: "MANAUSDT"  },
      { label: "AXS/USDT",   binance: "AXSUSDT"   },
      { label: "GALA/USDT",  binance: "GALAUSDT"  },
      { label: "ENJ/USDT",   binance: "ENJUSDT"   },
      { label: "IMX/USDT",   binance: "IMXUSDT"   },
      { label: "GODS/USDT",  binance: "GODSUSDT"  },
      { label: "PIXEL/USDT", binance: "PIXELUSDT" },
      { label: "RON/USDT",   binance: "RONUSDT"   },
    ],
  },
  {
    label: "Meme",
    symbols: [
      { label: "PEPE/USDT",  binance: "PEPEUSDT"  },
      { label: "FLOKI/USDT", binance: "FLOKIUSDT" },
      { label: "BONK/USDT",  binance: "BONKUSDT"  },
      { label: "WIF/USDT",   binance: "WIFUSDT"   },
      { label: "BOME/USDT",  binance: "BOMEUSDT"  },
      { label: "NEIRO/USDT", binance: "NEIROUSDT" },
    ],
  },
  {
    label: "Layer 1 / Layer 2",
    symbols: [
      { label: "FLOW/USDT",  binance: "FLOWUSDT"  },
      { label: "METIS/USDT", binance: "METISUSDT" },
      { label: "MINA/USDT",  binance: "MINAUSDT"  },
      { label: "ZIL/USDT",   binance: "ZILUSDT"   },
      { label: "WAVES/USDT", binance: "WAVESUSDT" },
      { label: "ICX/USDT",   binance: "ICXUSDT"   },
      { label: "QTUM/USDT",  binance: "QTUMUSDT"  },
      { label: "NEO/USDT",   binance: "NEOUSDT"   },
      { label: "IOTA/USDT",  binance: "IOTAUSDT"  },
      { label: "ONT/USDT",   binance: "ONTUSDT"   },
    ],
  },
];

// Flat list for easy lookup
const ALL_SYMBOLS: SymbolEntry[] = SYMBOL_GROUPS.flatMap(g => g.symbols);

const INTERVALS = ["1m", "5m", "15m", "1h", "4h", "1d", "1w", "1M"] as const;
type Interval = typeof INTERVALS[number];

// map display interval → Binance/engine interval
const INTERVAL_MAP: Record<Interval, string> = {
  "1m": "1m", "5m": "5m", "15m": "15m",
  "1h": "1h", "4h": "4h", "1d": "1d",
  "1w": "1w", "1M": "1M",
};

// milliseconds per candle (for pagination cursor)
const INTERVAL_MS: Record<Interval, number> = {
  "1m":  60_000,
  "5m":  300_000,
  "15m": 900_000,
  "1h":  3_600_000,
  "4h":  14_400_000,
  "1d":  86_400_000,
  "1w":  7 * 86_400_000,
  "1M":  30 * 86_400_000,
};

// Days of history to fetch. 0 = fetch from coin genesis (startTime = 0, Binance returns earliest available).
const DAYS_BACK: Record<Interval, number> = {
  "1m":  1,
  "5m":  3,
  "15m": 10,
  "1h":  180,
  "4h":  0,   // all available history
  "1d":  0,   // all available history
  "1w":  0,   // all available history
  "1M":  0,   // all available history
};

async function fetchAllKlines(
  symbol: string,
  interval: string,
  daysBack: number,
  signal: AbortSignal,
): Promise<any[]> {
  const iMs     = INTERVAL_MS[interval as Interval] ?? 3_600_000;
  // daysBack === 0 means "from coin genesis" → startTime 0 (Binance returns from listing date)
  const startMs = daysBack === 0 ? 0 : Date.now() - daysBack * 86_400_000;
  let   cursor  = startMs;
  const all: any[] = [];

  while (true) {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&startTime=${cursor}&limit=1000`;
    const r   = await fetch(url, { signal });
    if (!r.ok) break;
    const batch: any[] = await r.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < 1000) break;
    cursor = (batch[batch.length - 1][0] as number) + iMs;
  }

  return all;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Ticker = { price: number; change: number; high: number; low: number; volume: number };

type EngineResult = {
  symbol:      string;
  regime:      string;
  direction:   "BUY" | "SELL" | "WAIT";
  confidence:  number;
  confirmed:   boolean;
  sizing:      { allowed: boolean; stopLossPips: number; takeProfitPips: number; rr: number; riskAmount: number; reason?: string };
  votes:       Array<{ strategy: string; direction: string; confidence: number; reason: string }>;
  confirmationChecks: Array<{ name: string; passed: boolean; detail?: string }>;
};

// ── Indicator & Drawing Types ─────────────────────────────────────────────────

type IndSettings = {
  ma7:    { on: boolean; color: string };
  ma25:   { on: boolean; color: string };
  ma99:   { on: boolean; color: string };
  ema9:   { on: boolean; color: string };
  ema21:  { on: boolean; color: string };
  ema50:  { on: boolean; color: string };
  ema200: { on: boolean; color: string };
  bb:     { on: boolean; period: number; stdDev: number; color: string };
  rsi:    { on: boolean; period: number };
  macd:   { on: boolean };
};

const DEFAULT_IND: IndSettings = {
  ma7:    { on: true,  color: "#f59e0b" },
  ma25:   { on: true,  color: "#60a5fa" },
  ma99:   { on: true,  color: "#a78bfa" },
  ema9:   { on: false, color: "#34d399" },
  ema21:  { on: false, color: "#fb923c" },
  ema50:  { on: false, color: "#e879f9" },
  ema200: { on: false, color: "#f87171" },
  bb:     { on: false, period: 20, stdDev: 2, color: "#94a3b8" },
  rsi:    { on: false, period: 14 },
  macd:   { on: false },
};

type DrawTool = "cursor" | "trendline" | "hline" | "rect";
type Pt       = { time: number; price: number };
type Shape    =
  | { id: string; kind: "trendline"; p1: Pt; p2: Pt; color: string }
  | { id: string; kind: "hline";     price: number;  color: string }
  | { id: string; kind: "rect";      p1: Pt; p2: Pt; color: string };

// ── Calculations ──────────────────────────────────────────────────────────────

function calcMA(closes: number[], times: number[], period: number) {
  return closes.slice(period - 1).map((_, i) => ({
    time: times[i + period - 1] as any,
    value: closes.slice(i, i + period).reduce((s, v) => s + v, 0) / period,
  }));
}

function calcEMA(closes: number[], times: number[], period: number) {
  if (closes.length < period) return [];
  const k = 2 / (period + 1);
  let ema = closes.slice(0, period).reduce((s, v) => s + v, 0) / period;
  const out: { time: any; value: number }[] = [{ time: times[period - 1] as any, value: ema }];
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
    out.push({ time: times[i] as any, value: ema });
  }
  return out;
}

function calcBB(closes: number[], times: number[], period = 20, stdDev = 2) {
  const upper: any[] = [], middle: any[] = [], lower: any[] = [];
  for (let i = period - 1; i < closes.length; i++) {
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = slice.reduce((s, v) => s + v, 0) / period;
    const sd = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period);
    const t = times[i] as any;
    upper.push({ time: t, value: mean + stdDev * sd });
    middle.push({ time: t, value: mean });
    lower.push({ time: t, value: mean - stdDev * sd });
  }
  return { upper, middle, lower };
}

function calcRSI(closes: number[], times: number[], period = 14) {
  if (closes.length < period + 1) return [];
  let avgG = 0, avgL = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) avgG += d; else avgL -= d;
  }
  avgG /= period; avgL /= period;
  const out: { time: any; value: number }[] = [
    { time: times[period] as any, value: 100 - 100 / (1 + avgG / Math.max(avgL, 1e-10)) },
  ];
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgG = (avgG * (period - 1) + Math.max(d, 0)) / period;
    avgL = (avgL * (period - 1) + Math.max(-d, 0)) / period;
    out.push({ time: times[i] as any, value: 100 - 100 / (1 + avgG / Math.max(avgL, 1e-10)) });
  }
  return out;
}

function calcMACDData(closes: number[], times: number[], fast = 12, slow = 26, sig = 9) {
  if (closes.length < slow + sig) return { macd: [], signal: [], hist: [] };
  const kf = 2 / (fast + 1), ks = 2 / (slow + 1), ksg = 2 / (sig + 1);
  let ef = closes.slice(0, fast).reduce((s, v) => s + v, 0) / fast;
  const fastArr = [ef];
  for (let i = fast; i < closes.length; i++) { ef = closes[i] * kf + ef * (1 - kf); fastArr.push(ef); }
  let es = closes.slice(0, slow).reduce((s, v) => s + v, 0) / slow;
  const slowArr = [es];
  for (let i = slow; i < closes.length; i++) { es = closes[i] * ks + es * (1 - ks); slowArr.push(es); }
  const off = slow - fast;
  const macdLine = slowArr.map((v, i) => fastArr[i + off] - v);
  const mt = times.slice(slow - 1);
  let sgEma = macdLine.slice(0, sig).reduce((s, v) => s + v, 0) / sig;
  const macdOut: any[] = [], sigOut: any[] = [], histOut: any[] = [];
  for (let i = sig; i < macdLine.length; i++) {
    sgEma = macdLine[i] * ksg + sgEma * (1 - ksg);
    const t = mt[i] as any, m = macdLine[i], h = m - sgEma;
    macdOut.push({ time: t, value: m });
    sigOut.push({ time: t, value: sgEma });
    histOut.push({ time: t, value: h, color: h >= 0 ? "rgba(34,197,94,0.7)" : "rgba(239,68,68,0.7)" });
  }
  return { macd: macdOut, signal: sigOut, hist: histOut };
}

function LiveChart({
  symbol, interval, indicators, drawTool, shapes, onShapeAdd,
}: {
  symbol: string; interval: Interval;
  indicators: IndSettings; drawTool: DrawTool;
  shapes: Shape[]; onShapeAdd: (s: Shape) => void;
}) {
  const ref        = useRef<HTMLDivElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const chartRef   = useRef<IChartApi | null>(null);
  const candleRef  = useRef<any>(null);
  const volRef     = useRef<any>(null);
  // Overlay series (always created, toggle via visible)
  const ma7Ref    = useRef<any>(null); const ma25Ref   = useRef<any>(null); const ma99Ref   = useRef<any>(null);
  const ema9Ref   = useRef<any>(null); const ema21Ref  = useRef<any>(null);
  const ema50Ref  = useRef<any>(null); const ema200Ref = useRef<any>(null);
  const bbUpRef   = useRef<any>(null); const bbMidRef  = useRef<any>(null); const bbLowRef  = useRef<any>(null);
  // Sub-pane series (created/removed dynamically)
  const rsiRef    = useRef<any>(null); const rsi70Ref  = useRef<any>(null); const rsi30Ref  = useRef<any>(null);
  const macdHRef  = useRef<any>(null); const macdLRef  = useRef<any>(null); const macdSRef  = useRef<any>(null);

  const wsRef      = useRef<WebSocket | null>(null);
  const barsRef    = useRef<{ close: number; time: number; open: number; high: number; low: number; vol: number }[]>([]);
  const shapesRef  = useRef<Shape[]>(shapes);
  const pendingRef = useRef<Pt | null>(null);
  const mouseRef   = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const drawToolRef = useRef<DrawTool>(drawTool);
  const redrawRef  = useRef<() => void>(() => {});

  const [loading, setLoading] = useState(true);
  const binInterval = INTERVAL_MAP[interval];

  useEffect(() => { shapesRef.current = shapes; redrawRef.current(); }, [shapes]);
  useEffect(() => { drawToolRef.current = drawTool; }, [drawTool]);

  // ── Canvas rendering ──────────────────────────────────────────────────────────
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const chart  = chartRef.current;
    const series = candleRef.current;
    if (!canvas || !chart || !series) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const toXY = (pt: Pt) => {
      const x = chart.timeScale().timeToCoordinate(pt.time as any);
      const y = series.priceToCoordinate(pt.price);
      return x !== null && y !== null ? { x, y } : null;
    };

    for (const shape of shapesRef.current) {
      ctx.strokeStyle = "#e7b949"; ctx.lineWidth = 1.5; ctx.setLineDash([]);
      if (shape.kind === "trendline") {
        const a = toXY(shape.p1), b = toXY(shape.p2);
        if (a && b) {
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          ctx.fillStyle = "#e7b949";
          [a, b].forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill(); });
        }
      } else if (shape.kind === "hline") {
        const y = series.priceToCoordinate(shape.price);
        if (y !== null) {
          ctx.setLineDash([5, 4]);
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = "rgba(231,185,73,0.12)"; ctx.fillRect(0, y - 14, 72, 14);
          ctx.fillStyle = "#e7b949"; ctx.font = "bold 9px monospace";
          ctx.fillText(fmtPrice(shape.price), 4, y - 3);
        }
      } else if (shape.kind === "rect") {
        const a = toXY(shape.p1), b = toXY(shape.p2);
        if (a && b) {
          ctx.fillStyle = "rgba(231,185,73,0.06)";
          ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
          ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
        }
      }
    }

    // Live preview while placing second point
    if (pendingRef.current && (drawToolRef.current === "trendline" || drawToolRef.current === "rect")) {
      const a = toXY(pendingRef.current), m = mouseRef.current;
      if (a) {
        ctx.strokeStyle = "rgba(231,185,73,0.45)"; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
        if (drawToolRef.current === "trendline") {
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(m.x, m.y); ctx.stroke();
        } else {
          ctx.fillStyle = "rgba(231,185,73,0.04)";
          ctx.fillRect(a.x, a.y, m.x - a.x, m.y - a.y);
          ctx.strokeRect(a.x, a.y, m.x - a.x, m.y - a.y);
        }
        ctx.setLineDash([]);
      }
    }
  }, []);

  useEffect(() => { redrawRef.current = redrawCanvas; }, [redrawCanvas]);

  // ── Chart init ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ref.current) return;
    const chart = createChart(ref.current, {
      width: ref.current.clientWidth, height: ref.current.clientHeight || 500,
      layout: { background: { color: "transparent" }, textColor: "#64748b" },
      grid:   { vertLines: { color: "rgba(255,255,255,0.025)" }, horzLines: { color: "rgba(255,255,255,0.035)" } },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.06)", scaleMargins: { top: 0.05, bottom: 0.18 } },
      timeScale:  { borderColor: "rgba(255,255,255,0.06)", timeVisible: true, secondsVisible: false },
      crosshair:  { vertLine: { color: "rgba(231,185,73,0.3)" }, horzLine: { color: "rgba(231,185,73,0.3)" } },
    });
    chartRef.current = chart;

    candleRef.current = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e", downColor: "#ef4444",
      borderUpColor: "#22c55e", borderDownColor: "#ef4444",
      wickUpColor: "#86efac", wickDownColor: "#fca5a5",
    });
    volRef.current = chart.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "vol" });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.85, bottom: 0 }, visible: false });

    const mkL = (color: string) => chart.addSeries(LineSeries, { color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
    ma7Ref.current = mkL("#f59e0b"); ma25Ref.current = mkL("#60a5fa"); ma99Ref.current = mkL("#a78bfa");
    ema9Ref.current = mkL("#34d399"); ema21Ref.current = mkL("#fb923c"); ema50Ref.current = mkL("#e879f9"); ema200Ref.current = mkL("#f87171");
    bbUpRef.current  = chart.addSeries(LineSeries, { color: "#94a3b8", lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
    bbMidRef.current = chart.addSeries(LineSeries, { color: "#64748b", lineWidth: 1, lineStyle: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
    bbLowRef.current = chart.addSeries(LineSeries, { color: "#94a3b8", lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
    // All hidden initially
    [ma7Ref,ma25Ref,ma99Ref,ema9Ref,ema21Ref,ema50Ref,ema200Ref,bbUpRef,bbMidRef,bbLowRef].forEach(r => r.current?.applyOptions({ visible: false }));

    const ro = new ResizeObserver(() => {
      if (!ref.current || !chart) return;
      const w = ref.current.clientWidth, h = ref.current.clientHeight || 500;
      chart.applyOptions({ width: w, height: h });
      if (canvasRef.current) { canvasRef.current.width = w; canvasRef.current.height = h; }
      redrawRef.current();
    });
    ro.observe(ref.current);
    chart.timeScale().subscribeVisibleTimeRangeChange(() => redrawRef.current());

    return () => { chart.remove(); chartRef.current = null; ro.disconnect(); };
  }, []);

  // ── Data fetch ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!candleRef.current) return;
    setLoading(true);
    wsRef.current?.close();

    // Clear series + remove any sub-panes
    [candleRef,volRef,ma7Ref,ma25Ref,ma99Ref,ema9Ref,ema21Ref,ema50Ref,ema200Ref,bbUpRef,bbMidRef,bbLowRef].forEach(r => r.current?.setData([]));
    const rmv = (r: React.MutableRefObject<any>) => { if (r.current && chartRef.current) { chartRef.current.removeSeries(r.current); r.current = null; } };
    [rsiRef, rsi70Ref, rsi30Ref, macdHRef, macdLRef, macdSRef].forEach(rmv);

    chartRef.current?.timeScale().applyOptions({ secondsVisible: interval === "1m" || interval === "5m" });

    const controller = new AbortController();
    fetchAllKlines(symbol, binInterval, DAYS_BACK[interval], controller.signal)
      .then((raw) => {
        const bars = raw.map((k: any) => ({
          time: Math.floor(k[0] / 1000) as number,
          open: parseFloat(k[1]), high: parseFloat(k[2]), low: parseFloat(k[3]), close: parseFloat(k[4]), vol: parseFloat(k[5]),
        }));
        barsRef.current = bars;

        candleRef.current?.setData(bars.map(b => ({ time: b.time as any, open: b.open, high: b.high, low: b.low, close: b.close })));
        volRef.current?.setData(bars.map(b => ({ time: b.time as any, value: b.vol, color: b.close >= b.open ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)" })));

        applyAllIndicators(bars.map(b => b.close), bars.map(b => b.time), indicators);

        requestAnimationFrame(() => chartRef.current?.timeScale().fitContent());
        setLoading(false);

        const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${binInterval}`);
        ws.onmessage = (e) => {
          const k = JSON.parse(e.data as string).k;
          const bar = { time: Math.floor(k.t / 1000) as any, open: parseFloat(k.o), high: parseFloat(k.h), low: parseFloat(k.l), close: parseFloat(k.c) };
          candleRef.current?.update(bar);
          volRef.current?.update({ time: bar.time, value: parseFloat(k.v), color: bar.close >= bar.open ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)" });
        };
        wsRef.current = ws;
      })
      .catch(() => setLoading(false));

    return () => { controller.abort(); wsRef.current?.close(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, interval]);

  // ── Indicator application ─────────────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const applyAllIndicators = useCallback((closes: number[], times: number[], ind: IndSettings) => {
    // Overlays — data
    if (closes.length >= 7)   ma7Ref.current?.setData(calcMA(closes, times, 7));
    if (closes.length >= 25)  ma25Ref.current?.setData(calcMA(closes, times, 25));
    if (closes.length >= 99)  ma99Ref.current?.setData(calcMA(closes, times, 99));
    ema9Ref.current?.setData(calcEMA(closes, times, 9));
    ema21Ref.current?.setData(calcEMA(closes, times, 21));
    ema50Ref.current?.setData(calcEMA(closes, times, 50));
    ema200Ref.current?.setData(calcEMA(closes, times, 200));
    if (closes.length >= ind.bb.period) {
      const { upper, middle, lower } = calcBB(closes, times, ind.bb.period, ind.bb.stdDev);
      bbUpRef.current?.setData(upper); bbMidRef.current?.setData(middle); bbLowRef.current?.setData(lower);
    }
    // Overlays — visibility
    ma7Ref.current?.applyOptions({ visible: ind.ma7.on, color: ind.ma7.color });
    ma25Ref.current?.applyOptions({ visible: ind.ma25.on, color: ind.ma25.color });
    ma99Ref.current?.applyOptions({ visible: ind.ma99.on, color: ind.ma99.color });
    ema9Ref.current?.applyOptions({ visible: ind.ema9.on, color: ind.ema9.color });
    ema21Ref.current?.applyOptions({ visible: ind.ema21.on, color: ind.ema21.color });
    ema50Ref.current?.applyOptions({ visible: ind.ema50.on, color: ind.ema50.color });
    ema200Ref.current?.applyOptions({ visible: ind.ema200.on, color: ind.ema200.color });
    bbUpRef.current?.applyOptions({ visible: ind.bb.on, color: ind.bb.color });
    bbMidRef.current?.applyOptions({ visible: ind.bb.on, color: ind.bb.color });
    bbLowRef.current?.applyOptions({ visible: ind.bb.on, color: ind.bb.color });

    // RSI sub-pane
    if (ind.rsi.on && !rsiRef.current && chartRef.current) {
      const c = chartRef.current;
      rsiRef.current   = c.addSeries(LineSeries, { color: "#818cf8", lineWidth: 2, priceLineVisible: false, lastValueVisible: true }, 1);
      rsi70Ref.current = c.addSeries(LineSeries, { color: "rgba(239,68,68,0.3)", lineWidth: 1, lineStyle: 3, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false }, 1);
      rsi30Ref.current = c.addSeries(LineSeries, { color: "rgba(34,197,94,0.3)",  lineWidth: 1, lineStyle: 3, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false }, 1);
      try { c.panes()[1]?.setHeight(110); } catch (_) { /* ignore */ }
    }
    if (rsiRef.current && closes.length > ind.rsi.period + 1) {
      const rsiData = calcRSI(closes, times, ind.rsi.period);
      rsiRef.current?.setData(rsiData);
      const rt = rsiData.map((d: any) => d.time);
      rsi70Ref.current?.setData(rt.map((t: any) => ({ time: t, value: 70 })));
      rsi30Ref.current?.setData(rt.map((t: any) => ({ time: t, value: 30 })));
    }
    if (!ind.rsi.on && rsiRef.current && chartRef.current) {
      [rsiRef, rsi70Ref, rsi30Ref].forEach(r => { chartRef.current!.removeSeries(r.current); r.current = null; });
    }

    // MACD sub-pane
    const macdPane = ind.rsi.on ? 2 : 1;
    if (ind.macd.on && !macdHRef.current && chartRef.current) {
      const c = chartRef.current;
      macdHRef.current = c.addSeries(HistogramSeries, { priceScaleId: "macd", priceFormat: { type: "price", precision: 6, minMove: 0.000001 } }, macdPane);
      macdLRef.current = c.addSeries(LineSeries, { color: "#60a5fa", lineWidth: 2, priceLineVisible: false, lastValueVisible: false }, macdPane);
      macdSRef.current = c.addSeries(LineSeries, { color: "#f59e0b", lineWidth: 1,   priceLineVisible: false, lastValueVisible: false }, macdPane);
      try { c.panes()[macdPane]?.setHeight(100); } catch (_) { /* ignore */ }
    }
    if (macdHRef.current) {
      const { macd, signal, hist } = calcMACDData(closes, times);
      macdHRef.current?.setData(hist); macdLRef.current?.setData(macd); macdSRef.current?.setData(signal);
    }
    if (!ind.macd.on && macdHRef.current && chartRef.current) {
      [macdHRef, macdLRef, macdSRef].forEach(r => { chartRef.current!.removeSeries(r.current); r.current = null; });
    }
  }, []);

  // Apply when indicators change (without re-fetching data)
  useEffect(() => {
    const bars = barsRef.current;
    if (bars.length === 0) return;
    applyAllIndicators(bars.map(b => b.close), bars.map(b => b.time), indicators);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indicators]);

  // ── Drawing interaction ───────────────────────────────────────────────────────
  const getChartCoords = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current; const chart = chartRef.current; const series = candleRef.current;
    if (!canvas || !chart || !series) return null;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const time  = chart.timeScale().coordinateToTime(x);
    const price = series.coordinateToPrice(y);
    return time !== null && price !== null ? { x, y, time: time as number, price } : null;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const c = getChartCoords(e);
    if (c) { mouseRef.current = { x: c.x, y: c.y }; if (pendingRef.current) redrawRef.current(); }
  }, [getChartCoords]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const tool = drawToolRef.current; if (tool === "cursor") return;
    const c = getChartCoords(e); if (!c) return;

    if (tool === "hline") {
      onShapeAdd({ id: Date.now().toString(), kind: "hline", price: c.price, color: "#e7b949" });
      return;
    }
    if (!pendingRef.current) {
      pendingRef.current = { time: c.time, price: c.price };
    } else {
      const p1 = pendingRef.current; pendingRef.current = null;
      onShapeAdd({ id: Date.now().toString(), kind: tool as "trendline" | "rect", p1, p2: { time: c.time, price: c.price }, color: "#e7b949" });
      redrawRef.current();
    }
  }, [getChartCoords, onShapeAdd]);

  return (
    <div className="relative h-full w-full">
      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#080c14]/70">
          <Loader2 className="h-5 w-5 animate-spin text-[#e7b949]" />
          <p className="mt-2 text-[10px] text-slate-600">Loading chart data…</p>
        </div>
      )}
      <div ref={ref} className="h-full w-full" />
      {/* Canvas overlay — always pointer-events:none for rendering; interaction div below */}
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" />
      {drawTool !== "cursor" && (
        <div
          className="absolute inset-0 cursor-crosshair"
          style={{ zIndex: 5 }}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
        />
      )}
    </div>
  );
}

// ── Indicator Settings Panel ──────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange}
      className={`relative h-4 w-8 shrink-0 rounded-full transition-colors ${on ? "bg-[#e7b949]" : "bg-white/[0.08]"}`}>
      <span className={`absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${on ? "translate-x-4" : "translate-x-0"}`} />
    </button>
  );
}

function IndicatorPanel({ ind, onChange, onClose }: {
  ind: IndSettings; onChange: (next: IndSettings) => void; onClose: () => void;
}) {
  const set = <K extends keyof IndSettings>(key: K, val: Partial<IndSettings[K]>) =>
    onChange({ ...ind, [key]: { ...ind[key], ...val } });

  const LineRow = ({ k, label }: { k: "ma7"|"ma25"|"ma99"|"ema9"|"ema21"|"ema50"|"ema200"; label: string }) => {
    const item = ind[k];
    return (
      <div className="flex items-center justify-between py-1.5">
        <div className="flex items-center gap-2">
          <Toggle on={item.on} onChange={() => set(k, { on: !item.on } as any)} />
          <span className="text-xs text-slate-300">{label}</span>
        </div>
        <input type="color" value={item.color} onChange={e => set(k, { color: e.target.value } as any)}
          className="h-5 w-7 cursor-pointer rounded border border-white/[0.08] bg-transparent p-0" />
      </div>
    );
  };

  return (
    <div className="absolute right-0 top-0 z-30 flex h-full w-64 flex-col overflow-y-auto rounded-xl border border-white/[0.08] bg-[#080c14] shadow-2xl shadow-black/60">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-widest text-[#e7b949]">Indicators</p>
        <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="h-3.5 w-3.5" /></button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div>
          <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-slate-600">Simple Moving Average</p>
          <LineRow k="ma7" label="MA 7" /> <LineRow k="ma25" label="MA 25" /> <LineRow k="ma99" label="MA 99" />
        </div>
        <div>
          <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-slate-600">Exponential MA (EMA)</p>
          <LineRow k="ema9" label="EMA 9" /> <LineRow k="ema21" label="EMA 21" />
          <LineRow k="ema50" label="EMA 50" /> <LineRow k="ema200" label="EMA 200" />
        </div>
        <div>
          <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-slate-600">Bollinger Bands</p>
          <div className="flex items-center justify-between py-1.5">
            <div className="flex items-center gap-2">
              <Toggle on={ind.bb.on} onChange={() => set("bb", { on: !ind.bb.on })} />
              <span className="text-xs text-slate-300">BB</span>
            </div>
            <input type="color" value={ind.bb.color} onChange={e => set("bb", { color: e.target.value })}
              className="h-5 w-7 cursor-pointer rounded border border-white/[0.08] bg-transparent p-0" />
          </div>
          {ind.bb.on && (
            <div className="ml-10 mt-1 flex gap-3 text-[10px] text-slate-500">
              <label className="flex items-center gap-1">Period
                <input type="number" value={ind.bb.period} min={5} max={50}
                  onChange={e => set("bb", { period: +e.target.value })}
                  className="ml-1 w-10 rounded bg-white/[0.05] px-1 py-0.5 text-white outline-none" />
              </label>
              <label className="flex items-center gap-1">σ
                <input type="number" value={ind.bb.stdDev} min={1} max={4} step={0.5}
                  onChange={e => set("bb", { stdDev: +e.target.value })}
                  className="ml-1 w-9 rounded bg-white/[0.05] px-1 py-0.5 text-white outline-none" />
              </label>
            </div>
          )}
        </div>
        <div>
          <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-slate-600">Oscillators (Sub-pane)</p>
          <div className="flex items-center justify-between py-1.5">
            <div className="flex items-center gap-2">
              <Toggle on={ind.rsi.on} onChange={() => set("rsi", { on: !ind.rsi.on })} />
              <span className="text-xs text-slate-300">RSI</span>
            </div>
            {ind.rsi.on && (
              <label className="flex items-center gap-1 text-[10px] text-slate-500">Period
                <input type="number" value={ind.rsi.period} min={2} max={30}
                  onChange={e => set("rsi", { period: +e.target.value })}
                  className="ml-1 w-9 rounded bg-white/[0.05] px-1 py-0.5 text-white outline-none" />
              </label>
            )}
          </div>
          <div className="flex items-center py-1.5">
            <div className="flex items-center gap-2">
              <Toggle on={ind.macd.on} onChange={() => set("macd", { on: !ind.macd.on })} />
              <span className="text-xs text-slate-300">MACD (12,26,9)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Drawing Toolbar ────────────────────────────────────────────────────────────

function DrawToolbar({ active, onChange, onClear }: {
  active: DrawTool; onChange: (t: DrawTool) => void; onClear: () => void;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-white/[0.06] bg-[#0a0f1a] p-1">
      {([
        { id: "cursor"    as const, icon: <MousePointer2 className="h-3.5 w-3.5" />,   label: "Cursor"          },
        { id: "trendline" as const, icon: <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="2" y1="14" x2="14" y2="2"/></svg>, label: "Trend Line" },
        { id: "hline"     as const, icon: <Minus className="h-3.5 w-3.5" />,            label: "Horizontal Line" },
        { id: "rect"      as const, icon: <Square className="h-3.5 w-3.5" />,           label: "Rectangle"      },
      ] as const).map(({ id, icon, label }) => (
        <button key={id} title={label} onClick={() => onChange(id)}
          className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${active === id ? "bg-[#e7b949] text-[#080c14]" : "text-slate-500 hover:bg-white/[0.06] hover:text-white"}`}>
          {icon}
        </button>
      ))}
      <div className="my-0.5 h-px bg-white/[0.06]" />
      <button title="Clear drawings" onClick={onClear}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 transition hover:bg-red-500/10 hover:text-red-400">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── Order Book ────────────────────────────────────────────────────────────────

function OrderBook({ symbol }: { symbol: string }) {
  const book = useOrderBook(symbol);

  const allQtys = [...book.bids, ...book.asks].map(([, q]) => parseFloat(q));
  const maxQty  = Math.max(...allQtys, 1);
  const spread  = book.asks[0] && book.bids[0] ? parseFloat(book.asks[0][0]) - parseFloat(book.bids[0][0]) : 0;
  const spreadPct = book.bids[0] ? (spread / parseFloat(book.bids[0][0])) * 100 : 0;

  const OBRow = ({ price, qty, side }: { price: string; qty: string; side: "ask" | "bid" }) => {
    const p = parseFloat(price); const q = parseFloat(qty);
    const pct = Math.min((q / maxQty) * 100, 100);
    const isAsk = side === "ask";
    return (
      <div className="relative flex items-center justify-between px-3 py-[3px] font-mono text-[11px] hover:bg-white/[0.025] cursor-default select-none">
        <div className={`absolute inset-y-0 right-0 ${isAsk ? "bg-red-500/[0.09]" : "bg-emerald-500/[0.09]"}`} style={{ width: `${pct}%` }} />
        <span className={`relative z-10 font-semibold ${isAsk ? "text-red-400" : "text-emerald-400"}`}>{fmtPrice(p)}</span>
        <span className="relative z-10 text-slate-400">{q.toFixed(4)}</span>
        <span className="relative z-10 text-slate-600">{Math.round(p * q).toLocaleString()}</span>
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-white/[0.06] px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Order Book</p>
      </div>
      <div className="flex justify-between px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-700">
        <span>Price</span><span>Amount</span><span>Total</span>
      </div>
      <div className="flex flex-1 flex-col-reverse overflow-hidden">
        {book.asks.slice(0, 10).map(([p, q]) => <OBRow key={`a${p}`} price={p} qty={q} side="ask" />)}
      </div>
      <div className="flex items-center justify-between border-y border-white/[0.06] px-3 py-1.5">
        <span className="text-[10px] text-slate-600">Spread</span>
        <span className="font-mono text-xs font-bold text-[#e7b949]">{fmtPrice(spread)}</span>
        <span className="text-[10px] text-slate-600">{spreadPct.toFixed(3)}%</span>
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        {book.bids.slice(0, 10).map(([p, q]) => <OBRow key={`b${p}`} price={p} qty={q} side="bid" />)}
      </div>
    </div>
  );
}

// ── Recent Trades ─────────────────────────────────────────────────────────────

function RecentTrades({ symbol }: { symbol: string }) {
  const trades = useRecentTrades(symbol);
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-white/[0.06] px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Recent Trades</p>
      </div>
      <div className="flex justify-between px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-700">
        <span>Price</span><span>Qty</span><span>Time</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {trades.map((t) => (
          <div key={t.id} className="flex items-center justify-between px-3 py-[2px] font-mono text-[11px]">
            <span className={`font-semibold ${t.isBuy ? "text-emerald-400" : "text-red-400"}`}>{fmtPrice(parseFloat(t.price))}</span>
            <span className="text-slate-500">{parseFloat(t.qty).toFixed(3)}</span>
            <span className="text-slate-700">{new Date(t.time).toLocaleTimeString("en-US", { hour12: false })}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Ticker bar ────────────────────────────────────────────────────────────────

function useTicker(symbol: string) {
  const [ticker, setTicker] = useState<Ticker | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    wsRef.current?.close();
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@ticker`);
    ws.onmessage = (e) => {
      const t = JSON.parse(e.data as string);
      setTicker({
        price:  parseFloat(t.c),
        change: parseFloat(t.P),
        high:   parseFloat(t.h),
        low:    parseFloat(t.l),
        volume: parseFloat(t.q),
      });
    };
    wsRef.current = ws;
    return () => ws.close();
  }, [symbol]);

  return ticker;
}

// ── Order Book ────────────────────────────────────────────────────────────────

type OBEntry = [string, string]; // [price, qty]
type OBData  = { bids: OBEntry[]; asks: OBEntry[] };

function useOrderBook(symbol: string) {
  const [book, setBook] = useState<OBData>({ bids: [], asks: [] });
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    setBook({ bids: [], asks: [] });
    wsRef.current?.close();
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@depth20@100ms`);
    ws.onmessage = (e) => {
      const d = JSON.parse(e.data as string);
      setBook({ bids: (d.bids as OBEntry[]).slice(0, 14), asks: (d.asks as OBEntry[]).slice(0, 14) });
    };
    wsRef.current = ws;
    return () => ws.close();
  }, [symbol]);

  return book;
}

// ── Recent Trades ─────────────────────────────────────────────────────────────

type TradeEntry = { id: number; price: string; qty: string; isBuy: boolean; time: number };

function useRecentTrades(symbol: string) {
  const [trades, setTrades] = useState<TradeEntry[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    setTrades([]);
    wsRef.current?.close();
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@trade`);
    ws.onmessage = (e) => {
      const t = JSON.parse(e.data as string);
      setTrades(prev => [
        { id: t.t, price: t.p, qty: t.q, isBuy: !t.m, time: t.T },
        ...prev,
      ].slice(0, 30));
    };
    wsRef.current = ws;
    return () => ws.close();
  }, [symbol]);

  return trades;
}

function fmtPrice(n: number) {
  if (n >= 1000) return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 1)    return n.toFixed(4);
  return n.toFixed(6);
}
function fmtVol(n: number) {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

// ── Engine Panel ──────────────────────────────────────────────────────────────

function RegimeBadge({ regime }: { regime: string }) {
  const r = regime?.toUpperCase() ?? "";
  const cfg =
    r.includes("TREND")    ? { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: <TrendingUp className="h-3 w-3" /> } :
    r.includes("RANG")     ? { color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20",       icon: <Activity className="h-3 w-3" /> } :
    r.includes("VOLAT")    ? { color: "text-orange-400",  bg: "bg-orange-500/10 border-orange-500/20",   icon: <ShieldAlert className="h-3 w-3" /> } :
    { color: "text-slate-400", bg: "bg-white/[0.06] border-white/[0.08]", icon: <Activity className="h-3 w-3" /> };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cfg.bg} ${cfg.color}`}>
      {cfg.icon} {regime ?? "—"}
    </span>
  );
}

function DirectionCard({ direction, confidence, confirmed }: { direction: string; confidence: number; confirmed: boolean }) {
  if (direction === "WAIT") {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
        <p className="text-xs text-slate-600 uppercase tracking-widest mb-1">Decision</p>
        <p className="text-2xl font-extrabold text-slate-500">HOLD</p>
        <p className="mt-1 text-xs text-slate-600">No confirmed entry</p>
      </div>
    );
  }
  const isBuy = direction === "BUY";
  return (
    <div className={`rounded-xl border p-4 text-center ${
      isBuy
        ? "border-emerald-500/25 bg-emerald-500/[0.06]"
        : "border-red-500/25 bg-red-500/[0.06]"
    }`}>
      <p className="text-xs text-slate-600 uppercase tracking-widest mb-1">Decision</p>
      <div className="flex items-center justify-center gap-2">
        {isBuy
          ? <ArrowUpRight className="h-6 w-6 text-emerald-400" />
          : <ArrowDownRight className="h-6 w-6 text-red-400" />}
        <p className={`text-2xl font-extrabold ${isBuy ? "text-emerald-400" : "text-red-400"}`}>
          {direction}
        </p>
      </div>
      <div className="mt-2">
        <div className="flex justify-between text-[10px] text-slate-600 mb-1">
          <span>Confidence</span><span>{confidence}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isBuy ? "bg-emerald-500" : "bg-red-500"}`}
            style={{ width: `${confidence}%` }}
          />
        </div>
      </div>
      <div className="mt-2 flex items-center justify-center gap-1.5">
        {confirmed
          ? <><CheckCircle2 className="h-3 w-3 text-emerald-400" /><span className="text-[10px] text-emerald-400 font-bold">Signal Confirmed</span></>
          : <><XCircle className="h-3 w-3 text-red-400" /><span className="text-[10px] text-red-400">Not Confirmed</span></>}
      </div>
    </div>
  );
}

function EnginePanel({
  symbol, interval, currentPrice,
}: { symbol: string; interval: Interval; currentPrice: number | null }) {
  const [result, setResult]   = useState<EngineResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [showVotes, setShowVotes] = useState(false);

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      const res = await fetchWithAuth(`${API}/api/engine/analyze`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ symbol, interval: INTERVAL_MAP[interval] }),
        signal:  controller.signal,
      }).finally(() => clearTimeout(timeout));
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Analysis failed");
      setResult(data as EngineResult);
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") {
        setError("Request timed out — engine is taking too long. Try again.");
      } else {
        setError(
          e instanceof Error && e.message !== "Failed to fetch"
            ? e.message
            : "Cannot reach backend. Check that the server is running."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [symbol, interval]);

  // Auto-run on symbol/interval change
  useEffect(() => { runAnalysis(); }, [runAnalysis]);

  const price = currentPrice ?? 0;
  const sl = result && result.sizing.allowed && price > 0
    ? result.direction === "BUY"
      ? price - result.sizing.stopLossPips
      : price + result.sizing.stopLossPips
    : null;
  const tp = result && result.sizing.allowed && price > 0
    ? result.direction === "BUY"
      ? price + result.sizing.takeProfitPips
      : price - result.sizing.takeProfitPips
    : null;

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-[#e7b949]" />
          <span className="text-sm font-bold text-white">Decision Engine</span>
        </div>
        <button
          onClick={runAnalysis}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-xs text-slate-400 hover:bg-white/[0.08] disabled:opacity-40 transition"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Running…" : "Analyze"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {loading && !result && (
        <div className="flex items-center justify-center rounded-xl border border-white/[0.06] bg-[#0a0f1a] py-10">
          <Loader2 className="h-6 w-6 animate-spin text-[#e7b949]" />
        </div>
      )}

      {result && (
        <>
          {/* Regime */}
          <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#0a0f1a] px-4 py-3">
            <span className="text-xs text-slate-500">Market Regime</span>
            <RegimeBadge regime={result.regime} />
          </div>

          {/* Direction + confidence */}
          <DirectionCard
            direction={result.direction}
            confidence={result.confidence}
            confirmed={result.confirmed}
          />

          {/* SL / TP */}
          {result.sizing.allowed && sl !== null && tp !== null && result.direction !== "WAIT" && (
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-red-500/15 bg-red-500/[0.05] p-3 text-center">
                <p className="text-[10px] uppercase tracking-widest text-slate-600">Stop Loss</p>
                <p className="mt-1 font-mono text-sm font-bold text-red-400">${fmtPrice(sl)}</p>
              </div>
              <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.05] p-3 text-center">
                <p className="text-[10px] uppercase tracking-widest text-slate-600">Take Profit</p>
                <p className="mt-1 font-mono text-sm font-bold text-emerald-400">${fmtPrice(tp)}</p>
              </div>
            </div>
          )}

          {result.sizing.allowed && result.direction !== "WAIT" && (
            <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] px-4 py-2.5 flex items-center justify-between text-xs">
              <span className="text-slate-500">R:R Ratio</span>
              <span className="font-bold text-[#e7b949]">{result.sizing.rr}x</span>
            </div>
          )}

          {!result.sizing.allowed && result.sizing.reason && (
            <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] px-4 py-2.5 text-xs text-slate-500">
              <span className="font-bold text-slate-400">Engine: </span>{result.sizing.reason}
            </div>
          )}

          {/* Confirmation checks */}
          {result.confirmationChecks?.length > 0 && (
            <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-600">Confirmation Checks</p>
              <div className="space-y-1.5">
                {result.confirmationChecks.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {c.passed
                      ? <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-400" />
                      : <XCircle className="h-3 w-3 shrink-0 text-slate-600" />}
                    <span className={c.passed ? "text-slate-300" : "text-slate-600"}>{c.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strategy votes toggle */}
          {result.votes?.length > 0 && (
            <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-3">
              <button
                onClick={() => setShowVotes(v => !v)}
                className="flex w-full items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:text-slate-400 transition"
              >
                <span>Strategy Votes ({result.votes.length})</span>
                <span>{showVotes ? "▲" : "▼"}</span>
              </button>
              {showVotes && (
                <div className="mt-2 space-y-2">
                  {result.votes.map((v, i) => {
                    const isBuy  = v.direction === "BUY";
                    const isSell = v.direction === "SELL";
                    return (
                      <div key={i} className="flex items-start gap-2">
                        <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${isBuy ? "bg-emerald-400" : isSell ? "bg-red-400" : "bg-slate-600"}`} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white truncate">{v.strategy}</span>
                            <span className={`text-[10px] font-bold ${isBuy ? "text-emerald-400" : isSell ? "text-red-400" : "text-slate-500"}`}>
                              {v.direction}
                            </span>
                            <span className="text-[10px] text-slate-600">{v.confidence}%</span>
                          </div>
                          <p className="text-[10px] text-slate-600 leading-tight">{v.reason}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Coin icon (CoinCap CDN) ───────────────────────────────────────────────────

const COIN_OVERRIDE: Record<string, string> = {
  pol: "matic", matic: "matic", shib: "shib",
  "1inch": "1inch", wbtc: "wbtc", pepe: "pepe",
};

function coinSlug(binance: string): string {
  const base = binance.replace(/USDT$|BUSD$|USDC$|BTC$|ETH$/i, "").toLowerCase();
  return COIN_OVERRIDE[base] ?? base;
}

function CoinIcon({ binance, size = 20 }: { binance: string; size?: number }) {
  const [err, setErr] = useState(false);
  const slug = coinSlug(binance);
  const base = binance.replace(/USDT$|BUSD$|USDC$/i, "");

  if (err) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-full bg-[#e7b949]/10 font-bold text-[#e7b949]"
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {base.slice(0, 2)}
      </div>
    );
  }
  return (
    <img
      src={`https://assets.coincap.io/assets/icons/${slug}@2x.png`}
      alt={base}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="shrink-0 rounded-full object-contain"
      onError={() => setErr(true)}
    />
  );
}

// ── Symbol Search combobox ────────────────────────────────────────────────────

function SymbolSearch({
  value, onChange,
}: { value: string; onChange: (b: string) => void }) {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState("");
  const ref               = useRef<HTMLDivElement>(null);
  const inputRef          = useRef<HTMLInputElement>(null);

  const q = query.trim().toLowerCase();
  const filtered: SymbolGroup[] = q
    ? [{ label: "Results", symbols: ALL_SYMBOLS.filter(s => s.label.toLowerCase().includes(q) || s.binance.toLowerCase().includes(q)) }]
    : SYMBOL_GROUPS;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else setQuery("");
  }, [open]);

  function select(binance: string) {
    onChange(binance);
    setOpen(false);
  }

  const entry = ALL_SYMBOLS.find(s => s.binance === value);
  const label = entry?.label ?? value;

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-sm font-bold text-white transition hover:bg-white/[0.08]"
      >
        <CoinIcon binance={value} size={20} />
        <span className="font-mono">{label}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-72 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d1220] shadow-2xl shadow-black/60">
          {/* Search */}
          <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-slate-600" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search pair…"
              className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
            />
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto py-1">
            {filtered.map(group =>
              group.symbols.length === 0 ? null : (
                <div key={group.label}>
                  <p className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-slate-600">
                    {group.label}
                  </p>
                  {group.symbols.map(s => (
                    <button
                      key={s.binance}
                      onClick={() => select(s.binance)}
                      className={`flex w-full items-center gap-3 px-3 py-2 text-sm transition hover:bg-white/[0.05] ${
                        value === s.binance ? "text-[#e7b949]" : "text-slate-300 hover:text-white"
                      }`}
                    >
                      <CoinIcon binance={s.binance} size={22} />
                      <span className="flex-1 text-left font-mono font-bold">{s.label}</span>
                      {value === s.binance && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#e7b949]" />
                      )}
                    </button>
                  ))}
                </div>
              )
            )}
            {filtered[0]?.symbols.length === 0 && (
              <p className="px-3 py-6 text-center text-xs text-slate-600">No results for &quot;{query}&quot;</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Exchange Trading ──────────────────────────────────────────────────────────

function ExchangeTrading() {
  const [symbol,       setSymbol]       = useState(ALL_SYMBOLS[0].binance);
  const [interval,     setInterval]     = useState<Interval>("1h");
  const [indicators,   setIndicators]   = useState<IndSettings>(DEFAULT_IND);
  const [drawTool,     setDrawTool]     = useState<DrawTool>("cursor");
  const [shapes,       setShapes]       = useState<Shape[]>([]);
  const [showIndPanel, setShowIndPanel] = useState(false);
  const ticker = useTicker(symbol);

  const displayLabel   = ALL_SYMBOLS.find(s => s.binance === symbol)?.label ?? symbol;
  const changePos      = ticker ? ticker.change >= 0 : true;
  const activeIndCount = (Object.keys(indicators) as (keyof IndSettings)[])
    .filter(k => indicators[k].on).length;

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col gap-2 overflow-hidden px-3 py-3">

      {/* ── Top bar: symbol + OHLCV ── */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 rounded-xl border border-white/[0.06] bg-[#0a0f1a] px-4 py-2.5">
        <SymbolSearch value={symbol} onChange={setSymbol} />

        {ticker ? (
          <>
            <div className="h-7 w-px bg-white/[0.06]" />
            <span className="text-xl font-extrabold tabular-nums text-white">${fmtPrice(ticker.price)}</span>
            <span className={`text-sm font-bold ${changePos ? "text-emerald-400" : "text-red-400"}`}>
              {ticker.change >= 0 ? "+" : ""}{ticker.change.toFixed(2)}%
            </span>
            <div className="h-4 w-px bg-white/[0.06]" />
            <div className="flex gap-4 text-xs">
              <span><span className="text-slate-600">H </span><span className="font-mono text-slate-300">${fmtPrice(ticker.high)}</span></span>
              <span><span className="text-slate-600">L </span><span className="font-mono text-slate-300">${fmtPrice(ticker.low)}</span></span>
              <span><span className="text-slate-600">Vol </span><span className="font-mono text-slate-300">{fmtVol(ticker.volume)}</span></span>
            </div>
          </>
        ) : (
          <span className="text-xs text-slate-700">Connecting…</span>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          <span className="text-[10px] font-bold text-emerald-400">LIVE</span>
        </div>
      </div>

      {/* ── Toolbar: interval + indicator toggle ── */}
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {/* Interval pills */}
        <div className="flex gap-0.5 rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-1">
          {INTERVALS.map(iv => (
            <button
              key={iv}
              onClick={() => setInterval(iv)}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${
                interval === iv
                  ? "bg-white/[0.1] text-white"
                  : "text-slate-600 hover:text-slate-300"
              }`}
            >
              {iv}
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-white/[0.06]" />

        {/* Active indicator chips */}
        {(Object.entries(indicators) as [keyof IndSettings, IndSettings[keyof IndSettings]][])
          .filter(([, v]) => v.on)
          .map(([key, v]) => (
            <span
              key={key}
              className="flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-bold"
              style={{
                borderColor: ("color" in v ? v.color : "#94a3b8") + "40",
                color:       "color" in v ? v.color : "#94a3b8",
                background:  ("color" in v ? v.color : "#94a3b8") + "12",
              }}
            >
              {key.toUpperCase()}
              <button
                onClick={() => setIndicators(p => ({ ...p, [key]: { ...p[key], on: false } }))}
                className="ml-0.5 opacity-50 hover:opacity-100"
              >
                ×
              </button>
            </span>
          ))
        }

        {/* Indicators panel button */}
        <button
          onClick={() => setShowIndPanel(v => !v)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[10px] font-bold transition ${
            showIndPanel
              ? "border-[#e7b949]/40 bg-[#e7b949]/10 text-[#e7b949]"
              : "border-white/[0.06] text-slate-500 hover:text-slate-300"
          }`}
        >
          <SlidersHorizontal className="h-3 w-3" />
          Indicators{activeIndCount > 0 ? ` (${activeIndCount})` : ""}
        </button>
      </div>

      {/* ── Main 3-column body ── */}
      <div className="flex min-h-0 flex-1 gap-2">

        {/* Left: Order Book + Recent Trades */}
        <div className="hidden w-52 shrink-0 flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-[#0a0f1a] xl:flex">
          <div className="flex-1 min-h-0">
            <OrderBook symbol={symbol} />
          </div>
          <div className="h-px shrink-0 bg-white/[0.06]" />
          <div className="h-52 shrink-0 overflow-hidden">
            <RecentTrades symbol={symbol} />
          </div>
        </div>

        {/* Center: Chart + DrawToolbar */}
        <div className="relative min-w-0 flex-1 overflow-hidden rounded-xl border border-white/[0.06] bg-[#0a0f1a]">
          {/* Chart label bar */}
          <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2">
            <CoinIcon binance={symbol} size={16} />
            <span className="text-sm font-bold text-white">{displayLabel}</span>
            <span className="text-[10px] text-slate-600">{interval}</span>
            {indicators.ma7.on    && <span className="text-[10px] font-bold" style={{ color: indicators.ma7.color   }}>MA7</span>}
            {indicators.ma25.on   && <span className="text-[10px] font-bold" style={{ color: indicators.ma25.color  }}>MA25</span>}
            {indicators.ma99.on   && <span className="text-[10px] font-bold" style={{ color: indicators.ma99.color  }}>MA99</span>}
            {indicators.ema9.on   && <span className="text-[10px] font-bold" style={{ color: indicators.ema9.color  }}>EMA9</span>}
            {indicators.ema21.on  && <span className="text-[10px] font-bold" style={{ color: indicators.ema21.color }}>EMA21</span>}
            {indicators.ema50.on  && <span className="text-[10px] font-bold" style={{ color: indicators.ema50.color }}>EMA50</span>}
            {indicators.ema200.on && <span className="text-[10px] font-bold" style={{ color: indicators.ema200.color}}>EMA200</span>}
            {indicators.bb.on     && <span className="text-[10px] font-bold" style={{ color: indicators.bb.color    }}>BB({indicators.bb.period},{indicators.bb.stdDev})</span>}
            {indicators.rsi.on    && <span className="text-[10px] font-bold text-cyan-400">RSI({indicators.rsi.period})</span>}
            {indicators.macd.on   && <span className="text-[10px] font-bold text-violet-400">MACD</span>}
          </div>

          {/* Chart + draw toolbar row */}
          <div className="flex h-[calc(100%-37px)]">
            <div className="flex-1 min-w-0">
              <LiveChart
                symbol={symbol}
                interval={interval}
                indicators={indicators}
                drawTool={drawTool}
                shapes={shapes}
                onShapeAdd={(s) => setShapes(prev => [...prev, s])}
              />
            </div>
            <DrawToolbar
              active={drawTool}
              onChange={setDrawTool}
              onClear={() => setShapes([])}
            />
          </div>

          {/* Indicator panel overlay */}
          {showIndPanel && (
            <IndicatorPanel
              ind={indicators}
              onChange={setIndicators}
              onClose={() => setShowIndPanel(false)}
            />
          )}
        </div>

        {/* Right: Decision Engine */}
        <div className="hidden w-72 shrink-0 overflow-y-auto rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-4 xl:block">
          <EnginePanel symbol={symbol} interval={interval} currentPrice={ticker?.price ?? null} />
        </div>
      </div>
    </div>
  );
}

// ── Forex Trading ─────────────────────────────────────────────────────────────

type Position  = { symbol: string; type: string; volume: number; openPrice: number; profit: number };
type MT5Account = { id: string; accountNumber: string; broker: string; balance: number | null; equity: number | null; positions: Position[] };
type BotStatus  = { enabled: boolean; openTrades: number; totalTrades: number; winRate: number | null; lastSignal?: { symbol: string; direction: string; confidence: number } | null };

function ForexTrading() {
  const [accounts, setAccounts] = useState<MT5Account[]>([]);
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      fetchWithAuth(`${API}/api/mt5/accounts`).then(r => r.ok ? r.json() : []),
      fetchWithAuth(`${API}/api/bot/status`).then(r => r.ok ? r.json() : null),
    ]).then(([accs, bot]) => {
      setAccounts(accs);
      setBotStatus(bot);
    }).finally(() => setLoading(false));
  }, []);

  const allPositions = accounts.flatMap(a =>
    (a.positions ?? []).map(p => ({ ...p, broker: a.broker, accountNumber: a.accountNumber }))
  );
  const totalEquity  = accounts.reduce((s, a) => s + (a.equity  ?? 0), 0);
  const totalBalance = accounts.reduce((s, a) => s + (a.balance ?? 0), 0);
  const totalPnl     = allPositions.reduce((s, p) => s + p.profit, 0);

  return (
    <div className="space-y-6 py-6">

      {/* Header */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-6 lg:p-8">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#e7b949]">Forex / CFD</p>
        <h1 className="mt-1 text-2xl font-extrabold text-white">Trading Terminal</h1>
        <p className="mt-1 text-sm text-slate-400">MT5 account overview · open positions · bot status</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] bg-[#0a0f1a] py-16 text-center">
          <WifiOff className="mx-auto mb-3 h-8 w-8 text-slate-700" />
          <p className="text-sm font-bold text-white">No MT5 accounts connected</p>
          <p className="mt-1 text-xs text-slate-600">Go to Accounts to connect your MT5 terminal and install the EA.</p>
          <Link href="/dashboard/accounts"
            className="mt-4 rounded-xl px-5 py-2 text-sm font-bold text-[#0d1520] transition"
            style={{ background: "linear-gradient(135deg, #f7d36d 0%, #d4a017 100%)" }}>
            Connect MT5
          </Link>
        </div>
      ) : (
        <>
          {/* Account stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Total Balance",  value: `$${totalBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: "text-white" },
              { label: "Total Equity",   value: `$${totalEquity.toLocaleString("en-US",  { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: "text-white" },
              { label: "Float P&L",      value: `${totalPnl >= 0 ? "+" : ""}$${Math.abs(totalPnl).toFixed(2)}`, color: totalPnl >= 0 ? "text-emerald-400" : "text-red-400" },
              { label: "Open Positions", value: `${allPositions.length}`,        color: "text-white" },
            ].map(k => (
              <div key={k.label} className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{k.label}</p>
                <p className={`mt-2 text-2xl font-extrabold ${k.color}`}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Bot status card */}
          {botStatus && (
            <div className={`rounded-xl border p-5 ${botStatus.enabled ? "border-emerald-500/20 bg-emerald-500/[0.04]" : "border-white/[0.06] bg-[#0a0f1a]"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${botStatus.enabled ? "border-emerald-500/30 bg-emerald-500/10" : "border-white/[0.08] bg-white/[0.04]"}`}>
                    <Bot className={`h-4 w-4 ${botStatus.enabled ? "text-emerald-400" : "text-slate-600"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Trading Bot</p>
                    <p className={`text-xs font-bold ${botStatus.enabled ? "text-emerald-400" : "text-slate-500"}`}>
                      {botStatus.enabled ? "● RUNNING" : "○ STOPPED"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-xs">
                  <div className="text-center">
                    <p className="text-slate-500">Trades</p>
                    <p className="font-bold text-white">{botStatus.totalTrades}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-500">Open</p>
                    <p className="font-bold text-white">{botStatus.openTrades}</p>
                  </div>
                  {botStatus.winRate !== null && (
                    <div className="text-center">
                      <p className="text-slate-500">Win Rate</p>
                      <p className={`font-bold ${botStatus.winRate >= 50 ? "text-emerald-400" : "text-red-400"}`}>
                        {botStatus.winRate.toFixed(1)}%
                      </p>
                    </div>
                  )}
                  <Link href="/dashboard/bot"
                    className="rounded-lg border border-[#e7b949]/30 bg-[#e7b949]/10 px-3 py-1.5 text-xs font-bold text-[#e7b949] hover:bg-[#e7b949]/20 transition">
                    Manage Bot →
                  </Link>
                </div>
              </div>
              {botStatus.lastSignal && (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2 text-xs">
                  <Zap className="h-3 w-3 text-[#e7b949]" />
                  <span className="text-slate-500">Last signal:</span>
                  <span className="font-bold text-white">{botStatus.lastSignal.symbol}</span>
                  <span className={`font-bold ${botStatus.lastSignal.direction === "BUY" ? "text-emerald-400" : "text-red-400"}`}>
                    {botStatus.lastSignal.direction}
                  </span>
                  <span className="text-slate-600">{botStatus.lastSignal.confidence}% confidence</span>
                </div>
              )}
            </div>
          )}

          {/* Open positions */}
          {allPositions.length > 0 && (
            <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-5">
              <h2 className="mb-4 text-sm font-bold text-white">Open Positions</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.05] text-left text-[10px] uppercase tracking-widest text-slate-600">
                      <th className="pb-3 pr-4 font-medium">Symbol</th>
                      <th className="pb-3 pr-4 font-medium">Type</th>
                      <th className="pb-3 pr-4 font-medium">Volume</th>
                      <th className="pb-3 pr-4 font-medium">Open Price</th>
                      <th className="pb-3 pr-4 font-medium">Account</th>
                      <th className="pb-3 text-right font-medium">Float P&L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {allPositions.map((p, i) => (
                      <tr key={i} className="hover:bg-white/[0.02] transition">
                        <td className="py-3 pr-4 font-mono font-bold text-white">{p.symbol}</td>
                        <td className="py-3 pr-4">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            p.type === "BUY"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-red-500/10 text-red-400"
                          }`}>
                            {p.type === "BUY" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {p.type}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-slate-400">{p.volume.toFixed(2)}</td>
                        <td className="py-3 pr-4 font-mono text-xs text-slate-400">{p.openPrice.toFixed(5)}</td>
                        <td className="py-3 pr-4 text-xs text-slate-500">#{(p as any).accountNumber}</td>
                        <td className={`py-3 text-right font-bold font-mono ${p.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {p.profit >= 0 ? "+" : "-"}${Math.abs(p.profit).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {allPositions.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.06] bg-[#0a0f1a] py-12 text-center">
              <Activity className="mx-auto mb-3 h-7 w-7 text-slate-700" />
              <p className="text-sm font-bold text-white">No open positions</p>
              <p className="mt-1 text-xs text-slate-600">Positions opened via MT5 EA or Bot will appear here.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function TradingPage() {
  const mode = useMode();
  return mode === "forex" ? <ForexTrading /> : <ExchangeTrading />;
}
