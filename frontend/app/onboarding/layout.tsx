import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Setup Account | ApexQuant",
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#060b14] text-slate-100">
      {children}
    </div>
  );
}
