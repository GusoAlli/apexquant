import { Icon } from "@iconify/react";
import type { IconifyIcon } from "@iconify/react";
import type React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type IconifySymbolProps = {
  icon: string | IconifyIcon;
  className?: string;
  title?: string;
};

export function IconifySymbol({ icon, className, title }: IconifySymbolProps) {
  return <Icon icon={icon} aria-hidden={title ? undefined : true} aria-label={title} className={cn("h-5 w-5", className)} />;
}

type LucideSymbolProps = {
  icon: LucideIcon;
  className?: string;
  title?: string;
};

export function LucideSymbol({ icon: IconComponent, className, title }: LucideSymbolProps) {
  return <IconComponent aria-hidden={title ? undefined : true} aria-label={title} className={cn("h-5 w-5", className)} />;
}

type IconFrameProps = {
  children: React.ReactNode;
  className?: string;
  tone?: "blue" | "emerald" | "amber" | "red" | "neutral";
};

const frameTone = {
  blue: "border-[#e7b949]/30 bg-[#e7b949]/12 text-[#f2c85b]",
  emerald: "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
  amber: "border-amber-400/20 bg-amber-500/10 text-amber-300",
  red: "border-red-400/20 bg-red-500/10 text-red-300",
  neutral: "border-white/10 bg-white/[0.04] text-slate-300",
};

export function IconFrame({ children, className, tone = "blue" }: IconFrameProps) {
  return (
    <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-lg border", frameTone[tone], className)}>
      {children}
    </span>
  );
}
