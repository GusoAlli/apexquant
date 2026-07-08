import { bots } from "@/constants/dashboard";
import { PremiumCard, SectionHeader, StatusBadge } from "@/components/ui/premium-card";

export default function BrokerStatus() {
  return (
    <PremiumCard className="p-5">
      <SectionHeader eyebrow="Bot Management" title="EA Status" />
      <div className="mt-5 space-y-3 text-sm text-slate-200">
        {bots.map((bot) => (
          <div key={bot.name} className="rounded-lg border border-white/5 bg-[#07090d]/70 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-white">{bot.name}</p>
                <p className="text-slate-500">{bot.pair}</p>
              </div>
              <StatusBadge tone="success">{bot.status}</StatusBadge>
            </div>
          </div>
        ))}
      </div>
    </PremiumCard>
  );
}
