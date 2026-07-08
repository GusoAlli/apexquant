import Link from "next/link";
import { IconifySymbol } from "@/components/ui/icon";
import { ApexLogo } from "@/components/ui/ApexLogo";

const navGroups = [
  {
    title: "Platform",
    links: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "AI Signals", href: "/dashboard/signals" },
      { label: "Strategy Builder", href: "/dashboard/strategies" },
      { label: "Backtesting", href: "/dashboard/backtest" },
      { label: "Trading Bots", href: "/dashboard/ea" },
    ],
  },
  {
    title: "Analytics",
    links: [
      { label: "Portfolio", href: "/dashboard/portfolio" },
      { label: "Analytics", href: "/dashboard/analytics" },
      { label: "Risk Management", href: "/dashboard/risk" },
      { label: "Performance", href: "/dashboard/performance" },
      { label: "Live Trades", href: "/dashboard/trades" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Sign In", href: "/login" },
      { label: "Register", href: "/register" },
      { label: "Subscription", href: "/dashboard/licenses" },
      { label: "Profile", href: "/dashboard/profile" },
      { label: "API Keys", href: "/dashboard/api" },
    ],
  },
];

const socials = [
  { label: "Telegram", icon: "simple-icons:telegram" },
  { label: "Twitter / X", icon: "simple-icons:x" },
  { label: "Discord", icon: "simple-icons:discord" },
  { label: "GitHub", icon: "simple-icons:github" },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#060b14]">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(3,_1fr)]">
          {/* Brand */}
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <ApexLogo size={36} />
              <div className="leading-tight">
                <p className="text-xs font-bold uppercase tracking-widest text-white">ApexQuant</p>
                <p className="mt-0.5 pb-px text-[10px] uppercase tracking-widest text-[#e7b949]">AI Quant Trading</p>
              </div>
            </div>
            <p className="max-w-xs text-sm leading-7 text-slate-400">
              Institutional AI quant trading command center. AI-Powered. Data-Driven. Built for Traders.
            </p>
            <div className="flex items-center gap-2">
              {socials.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  aria-label={s.label}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-white/[0.07] bg-white/[0.03] text-slate-500 transition hover:border-[#e7b949]/25 hover:text-[#e7b949]"
                >
                  <IconifySymbol icon={s.icon} className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          </div>

          {/* Nav groups */}
          {navGroups.map((group) => (
            <div key={group.title}>
              <h4 className="mb-5 text-xs font-bold uppercase tracking-widest text-[#e7b949]">
                {group.title}
              </h4>
              <ul className="space-y-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-500 transition hover:text-slate-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-8 sm:flex-row">
          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} ApexQuant. All rights reserved.
          </p>
          <div className="flex items-center gap-5 text-xs text-slate-600">
            <Link href="#" className="hover:text-slate-400">Privacy Policy</Link>
            <Link href="#" className="hover:text-slate-400">Terms of Service</Link>
            <Link href="#" className="hover:text-slate-400">Cookie Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
