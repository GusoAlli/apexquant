"use client";

import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#020207] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(251,191,36,0.18),_transparent_32%)]" />
      <div className="absolute -bottom-28 left-1/2 h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-yellow-500/10 blur-3xl" />
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-slate-950/95 to-transparent" />

      <div className="relative mx-auto grid max-w-7xl gap-16 px-6 py-24 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            className="inline-flex rounded-full border border-yellow-500/20 bg-yellow-500/10 px-4 py-2 text-xs uppercase tracking-[0.35em] text-yellow-300"
          >
            Institutional-grade algorithmic trading
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl font-black leading-tight text-white sm:text-6xl lg:text-7xl"
          >
            AI-Powered.
            <span className="block text-yellow-400">Precision Driven.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="max-w-3xl text-lg leading-8 text-slate-300"
          >
            ApexQuant delivers next-generation algorithmic trading solutions for MetaTrader 5. Built with Smart Money Concepts, advanced AI, and institutional risk management.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="flex flex-col gap-4 sm:flex-row"
          >
            <button className="inline-flex items-center justify-center rounded-full bg-yellow-500 px-8 py-4 text-sm font-semibold text-black transition hover:bg-yellow-400">
              Get Started
            </button>
            <button className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-8 py-4 text-sm text-white transition hover:bg-white/10">
              View Performance
            </button>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { title: "AI Engine", subtitle: "Machine Learning & Adaptive Models" },
              { title: "Risk Management", subtitle: "Advanced Protection & Capital Guard" },
              { title: "Multi Market", subtitle: "Forex, Gold, Indices & Commodities" },
            ].map((item) => (
              <div key={item.title} className="rounded-3xl border border-white/10 bg-slate-950/80 p-5 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-500">{item.title}</p>
                <p className="mt-3 text-sm leading-6 text-slate-300">{item.subtitle}</p>
              </div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 shadow-[0_40px_120px_-80px_rgba(251,191,36,0.35)]"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.16),_transparent_36%)]" />
          <div className="relative space-y-6">
            <div className="flex items-center justify-between gap-4 text-white">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">ApexQuant Performance</p>
                <p className="mt-3 text-3xl font-semibold">$24,350.67</p>
              </div>
              <span className="rounded-2xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">+12.45%</span>
            </div>

            <div className="h-[280px] rounded-[2rem] bg-slate-900/90 p-4">
              <div className="h-full rounded-[1.75rem] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />
            </div>

            <div className="grid gap-3 sm:grid-cols-3 text-sm text-slate-400">
              <div className="rounded-3xl bg-black/30 p-4">
                <p className="uppercase tracking-[0.35em] text-slate-500">AI Engine</p>
                <p className="mt-2 text-white">Machine Learning</p>
              </div>
              <div className="rounded-3xl bg-black/30 p-4">
                <p className="uppercase tracking-[0.35em] text-slate-500">Risk</p>
                <p className="mt-2 text-white">Capital Guard</p>
              </div>
              <div className="rounded-3xl bg-black/30 p-4">
                <p className="uppercase tracking-[0.35em] text-slate-500">Markets</p>
                <p className="mt-2 text-white">Forex & Metals</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
