import type { LucideIcon } from "lucide-react";
import { IconFrame } from "@/components/ui/icon";
import { MetricTile, PanelRow, PremiumCard, SectionHeader, StatusBadge } from "@/components/ui/premium-card";

type Metric = {
  label: string;
  value: string;
  tone?: "success" | "warning" | "danger" | "info" | "neutral";
};

type Row = {
  label: string;
  value: string;
  meta: string;
  status: string;
};

type InstitutionalSectionPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  metrics: Metric[];
  rows: Row[];
};

export default function InstitutionalSectionPage({
  eyebrow,
  title,
  description,
  icon: Icon,
  metrics,
  rows,
}: InstitutionalSectionPageProps) {
  return (
    <div className="space-y-6 py-6">
      <PremiumCard className="p-6 lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader eyebrow={eyebrow} title={title} description={description} />
          <IconFrame tone="blue" className="h-12 w-12">
            <Icon className="h-6 w-6" />
          </IconFrame>
        </div>
      </PremiumCard>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricTile key={metric.label} label={metric.label} value={metric.value}>
            <div className="mt-4">
              <StatusBadge tone={metric.tone ?? "neutral"}>Live</StatusBadge>
            </div>
          </MetricTile>
        ))}
      </section>

      <PremiumCard className="p-5">
        <SectionHeader eyebrow="Workspace" title={`${title} Console`} />
        <div className="mt-5 overflow-hidden rounded-lg border border-white/5">
          {rows.map((row) => (
            <PanelRow key={row.label} className="grid gap-3 rounded-none border-0 border-b border-white/5 bg-white/[0.02] last:border-b-0 md:grid-cols-[1.2fr_1fr_1fr_auto]">
              <div>
                <p className="font-medium text-white">{row.label}</p>
                <p className="mt-1 text-sm text-slate-500">{row.meta}</p>
              </div>
              <p className="font-mono text-sm text-slate-300 md:self-center">{row.value}</p>
              <p className="text-sm text-slate-400 md:self-center">Institutional desk</p>
              <div className="md:self-center">
                <StatusBadge tone="success">{row.status}</StatusBadge>
              </div>
            </PanelRow>
          ))}
        </div>
      </PremiumCard>
    </div>
  );
}
