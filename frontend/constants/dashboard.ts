import {
  Activity,
  BarChart3,
  Brain,
  CalendarDays,
  DollarSign,
  Gauge,
  LineChart,
  ShieldAlert,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from "lucide-react";

// ── New dashboard data ────────────────────────────────────────────────────────

export const heroStats = [
  { label: "Total Users", value: "1.2M+", icon: Users },
  { label: "Users Online", value: "8,732", icon: Activity },
  { label: "System Online", value: "24/7", icon: ShieldCheck },
  { label: "Volume Traded", value: "$2.4B+", icon: DollarSign },
];

export const dashboardKpis = [
  { label: "Active Strategies", value: "136", delta: "+15.2%", icon: Target },
  { label: "AI Models Running", value: "48", delta: "+8.1%", icon: Brain },
  { label: "Signals Today", value: "782", delta: "+23.4%", icon: Zap },
  { label: "Win Rate (Community)", value: "67.8%", delta: "+5.2%", icon: BarChart3 },
  { label: "Total Profit (All Users)", value: "$2,456,321", delta: "+18.7%", icon: DollarSign },
];

export const performanceStats = {
  average: "+18.7%",
  totalProfit: "+$2,456,321",
  totalProfitUnit: "USDT",
  maxDrawdown: "-6.21%",
  sharpeRatio: "2.38",
};

export const topStrategies = [
  { name: "Quantum Alpha", badge: "AI" as const, return: "+327.18%" },
  { name: "SMC Institutional", badge: "Pro" as const, return: "+281.45%" },
  { name: "Neural Trend", badge: "AI" as const, return: "+288.32%" },
  { name: "Apex Momentum", badge: "Pro" as const, return: "+255.72%" },
  { name: "Liquidity Hunter", badge: "AI" as const, return: "+214.88%" },
];

export const topTraders = [
  { rank: 1, name: "Quantum Alpha", profit: "+327.18%", avatar: "QA" },
  { rank: 2, name: "Apex Momentum", profit: "+298.45%", avatar: "AM" },
  { rank: 3, name: "Neural Trend", profit: "+288.32%", avatar: "NT" },
  { rank: 4, name: "Smart Money AI", profit: "+255.73%", avatar: "SM" },
  { rank: 5, name: "Liquidity Hunter", profit: "+214.88%", avatar: "LH" },
  { rank: 1000, name: "Legend Trader", profit: "+98.21%", avatar: "LT" },
];

export const liveTrades = [
  { asset: "BTC/USDT", side: "Long" as const, time: "2m ago", icon: "cryptocurrency:btc" },
  { asset: "ETH/USDT", side: "Short" as const, time: "3m ago", icon: "cryptocurrency:eth" },
  { asset: "XAU/USD", side: "Long" as const, time: "4m ago", icon: "cryptocurrency:xau" },
  { asset: "NASDAQ100", side: "Long" as const, time: "5m ago", icon: "simple-icons:nasdaq" },
  { asset: "EUR/USD", side: "Short" as const, time: "6m ago", icon: "cryptocurrency:eur" },
];

export const aiSignals = [
  {
    asset: "BTC/USDT",
    direction: "Long" as const,
    entry: "11,250.00",
    tp: "114,500.00",
    sl: "109,000.00",
    strength: "Medium",
    type: "Purge",
    icon: "cryptocurrency:btc",
  },
  {
    asset: "ETH/USDT",
    direction: "Long" as const,
    entry: "6,180.00",
    tp: "6,520.00",
    sl: "6,000.00",
    strength: "Medium",
    type: "Purge",
    icon: "cryptocurrency:eth",
  },
  {
    asset: "XAU/USD",
    direction: "Short" as const,
    entry: "3,495.00",
    tp: "3,460.00",
    sl: "3,515.00",
    strength: "Medium",
    type: "Purge",
    icon: "cryptocurrency:xau",
  },
  {
    asset: "NASDAQ100",
    direction: "Long" as const,
    entry: "19,850.00",
    tp: "20,150.00",
    sl: "19,600.00",
    strength: "Medium",
    type: "Purge",
    icon: "simple-icons:nasdaq",
  },
];

export const marketHeatmap = [
  { symbol: "BTC", change: "+2.34%", positive: true },
  { symbol: "ETH", change: "+1.85%", positive: true },
  { symbol: "BNB", change: "+3.21%", positive: true },
  { symbol: "SOL", change: "+4.12%", positive: true },
  { symbol: "XAU", change: "+0.68%", positive: true },
  { symbol: "EUR/USD", change: "-0.21%", positive: false },
  { symbol: "GBP/USD", change: "+0.31%", positive: true },
  { symbol: "NAS100", change: "+0.74%", positive: true },
];

// ── Legacy exports (used by other dashboard sub-pages) ───────────────────────

export const kpis = [
  {
    label: "Portfolio Value",
    value: "$24.35M",
    delta: "+12.45%",
    detail: "Across 3 prime and retail venues",
    tone: "success" as const,
    icon: Wallet,
  },
  {
    label: "Daily PnL",
    value: "+$186.4K",
    delta: "+2.18%",
    detail: "Net realized and unrealized",
    tone: "success" as const,
    icon: TrendingUp,
  },
  {
    label: "Monthly Return",
    value: "+8.72%",
    delta: "+1.4%",
    detail: "Versus previous month",
    tone: "success" as const,
    icon: LineChart,
  },
  {
    label: "Win Rate",
    value: "84.27%",
    delta: "+3.21%",
    detail: "Last 280 executions",
    tone: "success" as const,
    icon: BarChart3,
  },
  {
    label: "AI Confidence",
    value: "91.6%",
    delta: "High",
    detail: "Model ensemble consensus",
    tone: "info" as const,
    icon: Brain,
  },
  {
    label: "Risk Score",
    value: "22/100",
    delta: "Low",
    detail: "Drawdown guard active",
    tone: "warning" as const,
    icon: ShieldAlert,
  },
];

export const systemSignals = [
  { label: "AI Monitoring", value: "Active", tone: "success" as const, icon: Brain },
  { label: "Server Status", value: "Operational", tone: "success" as const, icon: Activity },
  { label: "Connected Brokers", value: "3 Live", tone: "info" as const, icon: Activity },
  { label: "Live Latency", value: "18 ms", tone: "success" as const, icon: Zap },
];

export const markets = [
  { symbol: "EUR/USD", price: "1.0761", change: "+0.42%", tone: "success" as const, icon: "cryptocurrency:eur" },
  { symbol: "XAU/USD", price: "2,344.20", change: "-0.18%", tone: "danger" as const, icon: "cryptocurrency:xau" },
  { symbol: "US30", price: "39,824", change: "+0.61%", tone: "success" as const, icon: "simple-icons:dowjones" },
  { symbol: "BTC/USD", price: "68,420", change: "+1.34%", tone: "success" as const, icon: "cryptocurrency:btc" },
];

export const bots = [
  { name: "ApexQuant Trader v2.1.4", pair: "EURUSD - IC Markets", pnl: "+$42,580", risk: "Low", status: "Running" },
  { name: "Gold Momentum AI", pair: "XAUUSD - Exness", pnl: "+$31,240", risk: "Medium", status: "Running" },
  { name: "Index Breakout Desk", pair: "US30 - IC Markets", pnl: "+$17,910", risk: "Low", status: "Running" },
];

export const trades = [
  { asset: "EUR/USD", side: "Long", size: "12.4 lots", pnl: "+$8,420", time: "14:28 UTC" },
  { asset: "XAU/USD", side: "Short", size: "3.1 lots", pnl: "+$5,180", time: "14:12 UTC" },
  { asset: "BTC/USD", side: "Long", size: "1.8 BTC", pnl: "-$1,260", time: "13:58 UTC" },
  { asset: "US30", side: "Long", size: "8.0 lots", pnl: "+$4,920", time: "13:34 UTC" },
];

export const allocations = [
  { label: "FX Majors", value: "42%", color: "bg-blue-500" },
  { label: "Commodities", value: "24%", color: "bg-emerald-500" },
  { label: "Indices", value: "21%", color: "bg-amber-500" },
  { label: "Crypto", value: "13%", color: "bg-red-500" },
];

export const brokers = [
  { name: "IC Markets", account: "12345678", balance: "$12.45M", latency: "16 ms", status: "Active", icon: "simple-icons:metatrader" },
  { name: "Exness", account: "87654321", balance: "$7.85M", latency: "22 ms", status: "Active", icon: "simple-icons:tradingview" },
  { name: "IBKR Gateway", account: "AQ-4431", balance: "$4.05M", latency: "31 ms", status: "Active", icon: "simple-icons:interactivebrokers" },
];

export const calendar = [
  { event: "US Core PCE", impact: "High", time: "15:00 UTC", icon: CalendarDays },
  { event: "ECB Speakers", impact: "Medium", time: "16:30 UTC", icon: Gauge },
  { event: "API Crude Stocks", impact: "Medium", time: "20:30 UTC", icon: Activity },
];

export const aiAnalysis = [
  "FX regime remains trend-positive with lower volatility compression.",
  "Gold model reduced exposure by 18% after liquidity imbalance detected.",
  "Risk engine recommends holding max portfolio heat below 4.5% today.",
];

export const subscription = {
  plan: "ApexQuant Institutional",
  renews: "26 Jan 2026",
  usage: "3 / 5 broker seats",
  status: "Active",
};
