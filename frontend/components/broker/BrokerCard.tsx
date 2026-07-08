import { brokers } from "@/constants/dashboard";
import { IconFrame, IconifySymbol } from "@/components/ui/icon";
import { PremiumCard, SectionHeader, StatusBadge } from "@/components/ui/premium-card";

export default function BrokerCard() {
  return (
    <PremiumCard className="p-5">
      <SectionHeader eyebrow="Broker" title="Account Summary" />
      <div className="mt-5 overflow-hidden rounded-lg border border-white/5 text-sm">
        {brokers.map((broker) => (
          <div key={broker.account} className="grid gap-3 border-b border-white/5 bg-white/[0.02] p-4 last:border-b-0 sm:grid-cols-[1.1fr_1fr_1fr_auto] sm:items-center">
            <span className="flex items-center gap-3 font-medium text-white">
              <IconFrame tone="neutral" className="h-8 w-8">
                <IconifySymbol icon={broker.icon} className="h-4 w-4" />
              </IconFrame>
              {broker.name}
            </span>
            <span className="font-mono text-slate-400">{broker.account}</span>
            <span className="font-mono text-slate-200">{broker.balance}</span>
            <StatusBadge tone="success">{broker.status}</StatusBadge>
          </div>
        ))}
      </div>
    </PremiumCard>
  );
}
