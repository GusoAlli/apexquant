import type React from "react";
import { cn } from "@/lib/utils";

type PremiumCardProps = React.HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
};

export function PremiumCard({ className, interactive = false, ...props }: PremiumCardProps) {
  return (
    <div
      className={cn(
        "apex-surface rounded-lg",
        interactive && "transition duration-300 hover:-translate-y-0.5 hover:border-blue-400/30 hover:bg-white/[0.06]",
        className
      )}
      {...props}
    />
  );
}

type StatusBadgeProps = {
  children: React.ReactNode;
  tone?: "success" | "warning" | "danger" | "info" | "neutral";
  className?: string;
  showDot?: boolean;
};

const badgeTone = {
  success: "border-emerald-400/15 bg-emerald-500/10 text-emerald-300",
  warning: "border-amber-400/15 bg-amber-500/10 text-amber-300",
  danger: "border-red-400/15 bg-red-500/10 text-red-300",
  info: "border-blue-400/15 bg-blue-500/10 text-blue-300",
  neutral: "border-white/10 bg-white/[0.05] text-slate-300",
};

export function StatusBadge({ children, tone = "neutral", className, showDot = true }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        badgeTone[tone],
        className
      )}
    >
      {showDot ? <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export function SectionHeader({ eyebrow, title, description, action, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div>
        {eyebrow ? <p className="text-xs font-medium uppercase tracking-[0.22em] text-blue-300">{eyebrow}</p> : null}
        <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">{title}</h2>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

type MetricTileProps = {
  label: string;
  value: string;
  badge?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
};

export function MetricTile({ label, value, badge, children, className }: MetricTileProps) {
  return (
    <PremiumCard interactive className={cn("p-5", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
        </div>
        {badge}
      </div>
      {children}
    </PremiumCard>
  );
}

type PanelRowProps = React.HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
};

export function PanelRow({ className, interactive = false, ...props }: PanelRowProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-white/5 bg-white/[0.03] p-4",
        interactive && "transition hover:border-blue-400/20 hover:bg-white/[0.05]",
        className
      )}
      {...props}
    />
  );
}
