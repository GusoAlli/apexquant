import type { Metadata } from "next";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import SubscriptionGuard from "@/components/dashboard/SubscriptionGuard";
import OnboardingGuard from "@/components/dashboard/OnboardingGuard";
import DashboardClientProviders from "@/components/providers/DashboardClientProviders";
import "../globals.css";

export const metadata: Metadata = {
  title: "Dashboard | ApexQuant",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardClientProviders>
      <OnboardingGuard>
        <div className="flex h-screen flex-col overflow-hidden bg-[#060b14] text-slate-100">
          <Topbar variant="dashboard" />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
              <div className="p-4 sm:p-5">
                <SubscriptionGuard>{children}</SubscriptionGuard>
              </div>
            </main>
          </div>
        </div>
      </OnboardingGuard>
    </DashboardClientProviders>
  );
}
