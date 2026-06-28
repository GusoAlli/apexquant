import type { Metadata } from "next";
import Sidebar from "@/components/layout/Sidebar";
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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-6 px-4 py-6 xl:px-8">
        <Sidebar />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
