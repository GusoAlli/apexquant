"use client";

import { useState, useCallback } from "react";
import {
  Activity, BarChart3, Brain, ChevronDown, ChevronUp,
  Play, RefreshCw, Shield, TrendingDown, TrendingUp, Zap,
} from "lucide-react";
import { fetchWithAuth } from "@/lib/auth";
import { useMode } from "@/lib/useMode";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

type Direction   = "BUY" | "SELL" | "WAIT";
type VoteResult  = { strategy: string; direction: Direction; confidence: number; reason: string };
type CheckResult = { name: string; passed: boolean; detail: string };

type AnalysisResult = {
  symbol: string;
  regime: string;
  direction: Direction;
  confidence: number;
  confirmed: boolean;
  sizing: { allowed: boolean; lotSize: number; riskAmount: number; stopLossPips: number; takeProfitPips: number; rr: number; reason?: string };
  votes: VoteResult[];
  confirmationChecks: CheckResult[];
  candleCount: number;
};

type PortfolioScore = {
  symbol: string; score: number;
  trendScore: number; momentumScore: number; volatilityScore: number; liquidityScore: number;
};

const REGIME_COLORS: Record<string, string> = {
  TRENDING_UP:      "text-emerald-400",
  TRENDING_DOWN:    "text-red-400",
  SIDEWAYS:         "text-yellow-400",
  HIGH_VOLATILITY:  "text-orange-400",
  LOW_VOLATILITY:   "text-slate-400",
  BULL_MARKET:      "text-emerald-300",
  BEAR_MARKET:      "text-red-300",
};

const INTERVALS = ["15m","30m","1h","4h","1d"] as const;
type Interval = typeof INTERVALS[number];

function ScoreBar({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] text-slate-500 mb-1">
        <span>{label}</span><span>{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full bg-[#e7b949]" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function EnginePage() {
  const mode = useMode();

  const defaultSymbol   = mode === "forex" ? "EURUSD"  : "BTCUSDT";
  const defaultPortfolio = mode === "forex"
    ? "EURUSD,GBPUSD,USDJPY,XAUUSD,EURGBP"
    : "BTCUSDT,ETHUSDT,SOLUSDT,BNBUSDT,XRPUSDT";

  const [symbol,   setSymbol]   = useState(defaultSymbol);
  const [interval, setInterval] = useState<Interval>("1h");
  const [futures,  setFutures]  = useState(false);
  const [result,   setResult]   = useState<AnalysisResult | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [expanded, setExpanded] = useState(false);

  const [portfolio,       setPortfolio]       = useState<PortfolioScore[]>([]);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);
  const [portfolioSymbols, setPortfolioSymbols] = useState(defaultPortfolio);

  const analyze = useCallback(async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetchWithAuth(`${API}/api/engine/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: symbol.trim().toUpperCase(), interval, isFutures: futures }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? "Analysis failed"); }
      else setResult(data);
    } catch {
      setError("Connection error");
    }
    setLoading(false);
  }, [symbol, interval, futures]);

  const loadPortfolio = useCallback(async () => {
    setLoadingPortfolio(true);
    const syms = portfolioSymbols.split(",").map(s => s.trim().toUpperCase()).filter(Boolean).join(",");
    const res = await fetchWithAuth(`${API}/api/engine/portfolio?symbols=${syms}&interval=${interval}`);
    if (res.ok) setPortfolio(await res.json());
    setLoadingPortfolio(false);
  }, [portfolioSymbols, interval]);

  const dir = result?.direction;

  return (
    <div className="space-y-6 py-6">
      {/* Header */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-6">
        <div className="flex items-center gap-3">
          <Brain className="h-6 w-6 text-[#e7b949]" />
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#e7b949]">
              {mode === "forex" ? "Forex / CFD" : "Exchange"}
            </p>
            <h1 className="text-2xl font-extrabold text-white">Trading Engine</h1>
          </div>
        </div>
        <p className="mt-2 text-sm text-slate-400">
          7-layer analysis: Regime → Signal → Confirmation → Risk → Portfolio
        </p>
      </div>

      {/* Analyze form */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-5">
        <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#e7b949]">Single Asset Analysis</p>
        <div className="flex flex-wrap gap-3">
          <input
            value={symbol}
            onChange={e => setSymbol(e.target.value.toUpperCase())}
            className="apex-input w-36 text-sm font-mono"
            placeholder="BTCUSDT"
          />
          <select value={interval} onChange={e => setInterval(e.target.value as Interval)} className="apex-input text-sm">
            {INTERVALS.map(i => <option key={i}>{i}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
            <input type="checkbox" checked={futures} onChange={e => setFutures(e.target.checked)}
              className="rounded border-white/20 bg-transparent" />
            Futures
          </label>
          <button onClick={analyze} disabled={loading}
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-[#060b14] transition hover:brightness-110 disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#f7d36d 0%,#b98522 100%)" }}>
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Analyze
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        {/* Result */}
        {result && (
          <div className="mt-5 space-y-4">
            {/* Main signal */}
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                dir === "BUY" ? "bg-emerald-500/10" : dir === "SELL" ? "bg-red-500/10" : "bg-white/[0.04]"
              }`}>
                {dir === "BUY" ? <TrendingUp className="h-6 w-6 text-emerald-400" />
                  : dir === "SELL" ? <TrendingDown className="h-6 w-6 text-red-400" />
                  : <Activity className="h-6 w-6 text-slate-500" />}
              </div>
              <div className="flex-1">
                <p className="text-lg font-extrabold text-white">
                  {result.symbol} —{" "}
                  <span className={dir === "BUY" ? "text-emerald-400" : dir === "SELL" ? "text-red-400" : "text-slate-500"}>
                    {result.direction}
                  </span>
                </p>
                <p className="text-sm text-slate-400">
                  Confidence <span className="font-bold text-white">{result.confidence}%</span>
                  {" · "}Regime <span className={`font-bold ${REGIME_COLORS[result.regime] ?? "text-slate-400"}`}>{result.regime}</span>
                  {" · "}{result.candleCount} candles
                </p>
              </div>
              <div className="text-right">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                  result.confirmed ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                }`}>
                  {result.confirmed ? "CONFIRMED" : "NOT CONFIRMED"}
                </span>
              </div>
            </div>

            {/* Position sizing */}
            {result.sizing.allowed ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Lot Size",  value: result.sizing.lotSize.toFixed(2) },
                  { label: "Risk $",    value: `$${result.sizing.riskAmount.toFixed(2)}` },
                  { label: "R:R",       value: `1:${result.sizing.rr.toFixed(2)}` },
                  { label: "SL / TP",   value: `${result.sizing.stopLossPips.toFixed(5)} / ${result.sizing.takeProfitPips.toFixed(5)}` },
                ].map(card => (
                  <div key={card.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">{card.label}</p>
                    <p className="mt-1 text-sm font-bold text-white">{card.value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.05] px-4 py-3 text-sm text-red-400">
                <Shield className="h-4 w-4 shrink-0" />
                Risk blocked: {result.sizing.reason}
              </div>
            )}

            {/* Expand: votes + checks */}
            <button onClick={() => setExpanded(v => !v)}
              className="flex w-full items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-slate-400 hover:text-white">
              <span>Strategy Votes & Confirmation Checks</span>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {expanded && (
              <div className="grid gap-4 lg:grid-cols-2">
                {/* Votes */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#e7b949]">Strategy Votes</p>
                  <div className="space-y-2">
                    {result.votes.map((v, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-lg bg-white/[0.02] px-3 py-2">
                        <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                          v.direction === "BUY" ? "bg-emerald-400" : v.direction === "SELL" ? "bg-red-400" : "bg-slate-600"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white">{v.strategy}
                            {v.direction !== "WAIT" && <span className="ml-1 text-slate-400">({v.confidence}%)</span>}
                          </p>
                          <p className="text-[10px] text-slate-600 truncate">{v.reason}</p>
                        </div>
                        <span className={`text-[10px] font-bold ${
                          v.direction === "BUY" ? "text-emerald-400" : v.direction === "SELL" ? "text-red-400" : "text-slate-600"
                        }`}>{v.direction}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Confirmation checks */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#e7b949]">Confirmation Checks</p>
                  <div className="space-y-2">
                    {result.confirmationChecks.map((c, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-lg bg-white/[0.02] px-3 py-2">
                        <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${c.passed ? "bg-emerald-400" : "bg-red-400"}`} />
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-white">{c.name}</p>
                          <p className="text-[10px] text-slate-500">{c.detail}</p>
                        </div>
                        <span className={`text-[10px] font-bold ${c.passed ? "text-emerald-400" : "text-red-400"}`}>
                          {c.passed ? "PASS" : "FAIL"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Portfolio Ranking */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-5">
        <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#e7b949]">Portfolio Ranking</p>
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            value={portfolioSymbols}
            onChange={e => setPortfolioSymbols(e.target.value)}
            className="apex-input flex-1 min-w-[220px] text-sm font-mono"
            placeholder="BTCUSDT,ETHUSDT,SOLUSDT"
          />
          <button onClick={loadPortfolio} disabled={loadingPortfolio}
            className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm text-white transition hover:bg-white/[0.08] disabled:opacity-50">
            {loadingPortfolio ? <RefreshCw className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
            Rank
          </button>
        </div>

        {portfolio.length > 0 && (
          <div className="space-y-3">
            {portfolio.map((p, i) => (
              <div key={p.symbol} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e7b949]/10 text-xs font-extrabold text-[#e7b949]">
                      {i + 1}
                    </span>
                    <span className="font-bold text-white">{p.symbol}</span>
                  </div>
                  <span className="text-xl font-extrabold text-[#e7b949]">{p.score}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <ScoreBar value={p.trendScore}      label="Trend" />
                  <ScoreBar value={p.momentumScore}   label="Momentum" />
                  <ScoreBar value={p.volatilityScore} label="Volatility" />
                  <ScoreBar value={p.liquidityScore}  label="Liquidity" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
