import type { LucideIcon } from "lucide-react";
import { PremiumCard, StatusBadge } from "@/components/ui/premium-card";
import { IconFrame } from "@/components/ui/icon";

type KpiCardProps = {
  label: string;
  value: string;
  delta: string;
  detail: string;
  tone: "success" | "warning" | "danger" | "info" | "neutral";
  icon: LucideIcon;
};

export default function KpiCard({ label, value, delta, detail, tone, icon: Icon }: KpiCardProps) {
  return (
    <PremiumCard interactive className="p-5">
      <div className="flex items-start justify-between gap-4">
        <IconFrame tone="blue">
          <Icon className="h-5 w-5" />
        </IconFrame>
        <StatusBadge tone={tone}>{delta}</StatusBadge>
      </div>
      <p className="mt-5 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm leading-5 text-slate-400">{detail}</p>
    </PremiumCard>
  );
}
