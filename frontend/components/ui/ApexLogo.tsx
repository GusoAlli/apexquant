"use client";

import { useState } from "react";

export function ApexLogo({
  size = 40,
  showBg = false,
  className,
}: {
  size?: number;
  showBg?: boolean;
  className?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  // Use custom logo from public/brand/logo.png when available
  if (!imgFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/brand/logo.png"
        alt="ApexQuant"
        width={size}
        height={size}
        onError={() => setImgFailed(true)}
        className={className}
        style={{
          objectFit: "contain",
          display: "inline-block",
          flexShrink: 0,
          borderRadius: showBg ? "20%" : undefined,
        }}
      />
    );
  }

  // ── SVG fallback (shown when /brand/logo.png doesn't exist) ──────────────
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="ApexQuant"
    >
      <defs>
        <linearGradient id="aq-grad" x1="8" y1="5" x2="92" y2="95" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f7d36d" />
          <stop offset="48%" stopColor="#e7b949" />
          <stop offset="100%" stopColor="#a87118" />
        </linearGradient>
        <linearGradient id="aq-grad-top" x1="28" y1="12" x2="72" y2="12" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f7d36d" stopOpacity="0.7" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#f7d36d" stopOpacity="0.7" />
        </linearGradient>
        <radialGradient id="aq-bg-grad" cx="40%" cy="35%" r="65%" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1a2e50" />
          <stop offset="55%" stopColor="#0d1c34" />
          <stop offset="100%" stopColor="#060e1c" />
        </radialGradient>
        <filter id="aq-glow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {showBg && <rect width="100" height="100" rx="20" fill="url(#aq-bg-grad)" />}

      <polygon
        points="94,50 72,12 28,12 6,50 28,88 72,88"
        fill={showBg ? "transparent" : "rgba(8,14,26,0.55)"}
      />
      <polygon
        points="94,50 72,12 28,12 6,50 28,88 72,88"
        fill="none"
        stroke="#e7b949"
        strokeWidth="9"
        strokeOpacity="0.07"
        strokeLinejoin="round"
      />
      <polyline
        points="72,12 28,12 6,50"
        fill="none"
        stroke="url(#aq-grad-top)"
        strokeWidth="3.5"
        strokeOpacity="0.55"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polygon
        points="94,50 72,12 28,12 6,50 28,88 72,88"
        fill="none"
        stroke="url(#aq-grad)"
        strokeWidth="4"
        strokeLinejoin="round"
        filter="url(#aq-glow)"
      />
      <text
        x="50"
        y="65"
        textAnchor="middle"
        fontFamily="'Arial Black', 'Arial Bold', Arial, Impact, sans-serif"
        fontWeight="900"
        fontSize="43"
        fill="url(#aq-grad)"
        letterSpacing="-4"
        filter="url(#aq-glow)"
      >
        AQ
      </text>
    </svg>
  );
}
