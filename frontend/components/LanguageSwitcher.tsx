"use client";

import { useEffect, useRef, useState } from "react";
import { Globe, Search, X } from "lucide-react";

const LANGUAGES = [
  { code: "en", name: "English",            nativeName: "English" },
  { code: "id", name: "Indonesian",         nativeName: "Bahasa Indonesia" },
  { code: "ar", name: "Arabic",             nativeName: "العربية" },
  { code: "zh", name: "Chinese",            nativeName: "中文（简体）" },
  { code: "es", name: "Spanish",            nativeName: "Español" },
  { code: "pt", name: "Portuguese",         nativeName: "Português" },
  { code: "fr", name: "French",             nativeName: "Français" },
  { code: "de", name: "German",             nativeName: "Deutsch" },
  { code: "ja", name: "Japanese",           nativeName: "日本語" },
  { code: "ko", name: "Korean",             nativeName: "한국어" },
  { code: "ru", name: "Russian",            nativeName: "Русский" },
  { code: "tr", name: "Turkish",            nativeName: "Türkçe" },
  { code: "hi", name: "Hindi",              nativeName: "हिन्दी" },
] as const;

export function LanguageSwitcher() {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState("");
  const [current, setCurrent] = useState("en");
  const [saving, setSaving]   = useState(false);
  const panelRef  = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)aq_locale=([^;]+)/);
    setCurrent(match?.[1] ?? "en");
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => searchRef.current?.focus(), 60);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = async (code: string) => {
    if (code === current || saving) return;
    setSaving(true);
    try {
      await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: code }),
      });
      setCurrent(code);
      setOpen(false);
      window.location.reload();
    } finally {
      setSaving(false);
    }
  };

  const filtered = LANGUAGES.filter(
    (l) =>
      l.name.toLowerCase().includes(query.toLowerCase()) ||
      l.nativeName.toLowerCase().includes(query.toLowerCase())
  );

  const currentLang = LANGUAGES.find((l) => l.code === current) ?? LANGUAGES[0];

  return (
    <div className="relative" ref={panelRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={saving}
        aria-label="Switch language"
        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition disabled:opacity-50 ${
          open
            ? "border-[#e7b949]/40 bg-[#e7b949]/8 text-[#e7b949]"
            : "border-white/[0.08] bg-white/[0.04] text-slate-300 hover:border-white/20 hover:text-white"
        }`}
      >
        <Globe className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden font-medium sm:inline">{currentLang.nativeName}</span>
      </button>

      {/* Panel */}
      {open && (
        <>
          {/* Backdrop for mobile */}
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm sm:hidden" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d1520] shadow-[0_24px_60px_rgba(0,0,0,0.7)]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <span className="text-sm font-semibold text-white">Language</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-slate-500 transition hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Search */}
            <div className="border-b border-white/[0.06] px-3 py-2.5">
              <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2">
                <Search className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search language…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 focus:outline-none"
                />
                {query && (
                  <button type="button" onClick={() => setQuery("")} className="text-slate-500 hover:text-white">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Language list */}
            <div className="max-h-72 overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-600">No results</p>
              ) : (
                filtered.map((l) => {
                  const active = l.code === current;
                  return (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => select(l.code)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                        active
                          ? "bg-[#e7b949]/10 text-[#e7b949]"
                          : "text-slate-300 hover:bg-white/[0.04] hover:text-white"
                      }`}
                    >
                      <div className="flex flex-1 flex-col gap-0.5">
                        <span className="text-sm font-medium leading-none">{l.nativeName}</span>
                        <span className={`text-[11px] ${active ? "text-[#e7b949]/60" : "text-slate-600"}`}>
                          {l.name}
                        </span>
                      </div>
                      {active && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#e7b949]" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
