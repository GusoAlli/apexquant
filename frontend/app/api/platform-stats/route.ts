import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const base = process.env.BACKEND_URL ?? "http://localhost:4000";
    const res = await fetch(`${base}/api/stats`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error("backend error");
    const data: { totalUsers: number; onlineUsers: number } = await res.json();
    return NextResponse.json({ totalUsers: data.totalUsers, onlineUsers: data.onlineUsers });
  } catch {
    // Fallback so frontend never breaks if backend is down
    return NextResponse.json({ totalUsers: null, onlineUsers: null });
  }
}
