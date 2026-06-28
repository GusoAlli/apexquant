"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function Topbar() {
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    try {
      const token = localStorage.getItem("accessToken");
      setIsAuth(!!token);
    } catch (e) {
      setIsAuth(false);
    }
  }, []);

  return (
    <motion.nav
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-slate-950/95 backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-yellow-500 text-black text-xl font-bold">
            A
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-yellow-300">
              ApexQuant
            </p>
          </div>
        </div>

        <div className="hidden items-center gap-8 text-slate-300 xl:flex">
          <a href="#" className="hover:text-white transition">Home</a>
          <a href="#" className="hover:text-white transition">Products</a>
          <a href="#" className="hover:text-white transition">Pricing</a>
          <a href="#" className="hover:text-white transition">Performance</a>
          <a href="#" className="hover:text-white transition">Resources</a>
          <a href="#" className="hover:text-white transition">About Us</a>
        </div>

        <div className="flex items-center gap-3">
          <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:border-yellow-400 hover:text-white">
            EN
          </button>
          {isAuth ? (
            <Link href="/dashboard/profile" className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/10">
              Profile
            </Link>
          ) : null}
          <Link href="/login" className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/10">
            Login
          </Link>
          <Link href="/register" className="rounded-2xl bg-yellow-500 px-5 py-2 text-sm font-semibold text-black transition hover:bg-yellow-400">
            Get Started
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}
