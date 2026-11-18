import React from "react";
import Link from "next/link";
import { connection } from "next/server";

function CelestialApsaraShowcase() {
  return (
    <div className="relative hidden h-full w-full flex-col justify-between overflow-hidden border-r border-amber-500/15 bg-[#060608] p-12 lg:flex xl:p-16">
      {/* Deep Radial Gold & Obsidian Ambient Lighting */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_35%_45%,rgba(245,158,11,0.14),transparent_60%)]" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-amber-600/10 blur-[120px]" />

      {/* Subtle Architectural Corner Frame Lines */}
      <div className="pointer-events-none absolute inset-6 rounded-3xl border border-amber-400/10" />
      <div className="pointer-events-none absolute inset-8 rounded-2xl border border-amber-400/[0.04]" />

      {/* Top Brand Header */}
      <div className="relative z-10 flex items-center justify-between">
        <Link href="/" className="group inline-flex items-center gap-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-500/10 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.15)] transition-all group-hover:border-amber-400/60">
            <span className="font-serif text-lg font-bold tracking-wider">
              A
            </span>
          </div>
          <div>
            <span className="block text-sm font-semibold uppercase tracking-[0.32em] text-amber-300">
              Apsara
            </span>
            <span className="block text-[10px] uppercase tracking-[0.2em] text-neutral-500">
              Celestial Sanctuary
            </span>
          </div>
        </Link>

        <span className="rounded-full border border-amber-500/20 bg-amber-500/5 px-3.5 py-1 text-[11px] font-medium tracking-widest text-amber-300/80 uppercase">
          Private Access
        </span>
      </div>

      {/* Centerpiece: Grand Celestial Apsara & Sacred Mandala SVG */}
      <div className="relative z-10 my-auto flex flex-col items-center justify-center">
        <div className="relative flex h-[380px] w-[380px] items-center justify-center xl:h-[430px] xl:w-[430px]">
          {/* Outer Rotating Sacred Geometry Ring */}
          <svg
            viewBox="0 0 400 400"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute inset-0 h-full w-full animate-[spin_90s_linear_infinite] opacity-60"
          >
            <circle
              cx="200"
              cy="200"
              r="188"
              stroke="url(#ringGrad)"
              strokeWidth="0.75"
              strokeDasharray="3 6"
            />
            <circle
              cx="200"
              cy="200"
              r="164"
              stroke="url(#ringGrad)"
              strokeWidth="1"
              strokeOpacity="0.4"
            />
            {/* 12 Lotus Petals around the Celestial Halo */}
            {Array.from({ length: 12 }).map((_, i) => (
              <g key={i} transform={`rotate(${i * 30} 200 200)`}>
                <path
                  d="M200 12C206 24 206 34 200 42C194 34 194 24 200 12Z"
                  stroke="#F59E0B"
                  strokeOpacity="0.45"
                  strokeWidth="1"
                />
                <circle
                  cx="200"
                  cy="52"
                  r="1.5"
                  fill="#FDE68A"
                  fillOpacity="0.6"
                />
              </g>
            ))}
            <defs>
              <linearGradient id="ringGrad" x1="0" y1="0" x2="400" y2="400">
                <stop offset="0%" stopColor="#FDE68A" />
                <stop offset="50%" stopColor="#D97706" />
                <stop offset="100%" stopColor="#78350F" />
              </linearGradient>
            </defs>
          </svg>

          {/* Inner Architectural Arch & Dancing Apsara Silhouette */}
          <svg
            viewBox="0 0 320 320"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="relative h-72 w-72 drop-shadow-[0_0_35px_rgba(245,158,11,0.28)] xl:h-80 xl:w-80"
          >
            <defs>
              <linearGradient
                id="heroGold"
                x1="60"
                y1="20"
                x2="260"
                y2="300"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#FEF3C7" />
                <stop offset="35%" stopColor="#F59E0B" />
                <stop offset="75%" stopColor="#B45309" />
                <stop offset="100%" stopColor="#FDE68A" />
              </linearGradient>
              <radialGradient id="auraGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Soft Aura Backdrop */}
            <circle cx="160" cy="160" r="120" fill="url(#auraGlow)" />

            {/* Khmer Temple Niche Arch */}
            <path
              d="M78 258V148C78 96 114 56 160 44C206 56 242 96 242 148V258"
              stroke="url(#heroGold)"
              strokeWidth="1.5"
              strokeOpacity="0.65"
            />
            <path
              d="M88 258V152C88 106 119 70 160 58C201 70 232 106 232 152V258"
              stroke="url(#heroGold)"
              strokeWidth="0.8"
              strokeDasharray="4 4"
              strokeOpacity="0.45"
            />

            {/* Crown Spire (Mokot) */}
            <path d="M160 28L166 54H154L160 28Z" fill="url(#heroGold)" />
            <path d="M148 59H172L176 68H144L148 59Z" fill="url(#heroGold)" />
            <path d="M140 72H180L184 80H136L140 72Z" fill="url(#heroGold)" />

            {/* Halo behind Head */}
            <circle
              cx="160"
              cy="98"
              r="30"
              stroke="url(#heroGold)"
              strokeWidth="1.2"
              strokeOpacity="0.55"
            />

            {/* Serene Face & Ornate Earrings */}
            <path
              d="M147 86C147 97 152.5 106 160 106C167.5 106 173 97 173 86"
              stroke="url(#heroGold)"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <path
              d="M139 85C134 92 133 102 137 110"
              stroke="url(#heroGold)"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M181 85C186 92 187 102 183 110"
              stroke="url(#heroGold)"
              strokeWidth="1.8"
              strokeLinecap="round"
            />

            {/* Royal Collar & Torso */}
            <path
              d="M142 122L160 135L178 122"
              stroke="url(#heroGold)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M146 124C149 144 152 158 148 176H172C168 158 171 144 174 124"
              stroke="url(#heroGold)"
              strokeWidth="2"
              strokeLinejoin="round"
            />

            {/* Left Graceful Dancing Arm & Mudra */}
            <path
              d="M142 124C122 130 108 122 101 106C98 99 102 93 107 95"
              stroke="url(#heroGold)"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            {/* Right Graceful Dancing Arm & Mudra */}
            <path
              d="M178 124C198 130 212 122 219 106C222 99 218 93 213 95"
              stroke="url(#heroGold)"
              strokeWidth="2.2"
              strokeLinecap="round"
            />

            {/* Flowing Silk Sampot (Skirt Drapes) */}
            <path
              d="M148 176L132 236H188L172 176"
              stroke="url(#heroGold)"
              strokeWidth="2"
              fill="url(#heroGold)"
              fillOpacity="0.08"
            />
            <path d="M160 176V236" stroke="url(#heroGold)" strokeWidth="1.5" />
            {/* Flowing Side Ribbons */}
            <path
              d="M138 182C118 196 110 218 116 238"
              stroke="url(#heroGold)"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <path
              d="M182 182C202 196 210 218 204 238"
              stroke="url(#heroGold)"
              strokeWidth="1.4"
              strokeLinecap="round"
            />

            {/* Grand Lotus Pedestal */}
            <path
              d="M104 252C124 241 142 238 160 238C178 238 196 241 216 252C196 263 178 266 160 266C142 266 124 263 104 252Z"
              stroke="url(#heroGold)"
              strokeWidth="2"
              fill="url(#heroGold)"
              fillOpacity="0.16"
            />
            <path
              d="M124 274C138 279 149 281 160 281C171 281 182 279 196 274"
              stroke="url(#heroGold)"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* Bottom Editorial Quote / Brand Statement */}
      <div className="relative z-10 max-w-md">
        <div className="mb-4 h-px w-12 bg-gradient-to-r from-amber-400 to-transparent" />
        <blockquote className="text-lg font-light leading-relaxed tracking-wide text-neutral-200">
          “Where timeless grace meets modern precision—crafted for those who
          value elegance in every detail.”
        </blockquote>
        <div className="mt-4 flex items-center gap-3 text-xs uppercase tracking-[0.22em] text-amber-400/80">
          <span>Heritage</span>
          <span className="h-1 w-1 rounded-full bg-amber-400/60" />
          <span>Poise</span>
          <span className="h-1 w-1 rounded-full bg-amber-400/60" />
          <span>Exclusivity</span>
        </div>
      </div>
    </div>
  );
}

async function CopyrightFooter() {
  await connection();

  return (
    <footer className="relative z-10 mt-10 text-center text-xs text-neutral-500">
      &copy; {new Date().getFullYear()} Apsara. All rights reserved.
    </footer>
  );
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen w-full bg-[#070709] text-white lg:grid-cols-[1.15fr_1fr]">
      {/* Left Side: Luxury Dark Gold Apsara Showcase */}
      <CelestialApsaraShowcase />

      {/* Right Side: Auth Form Stage */}
      <main className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-8">
        {/* Subtle Background Texture & Glow for Form Stage */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.07),transparent_55%)]" />

        {/* Mobile-only Top Brand Bar */}
        <div className="relative z-10 mb-8 flex items-center gap-2.5 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-500/10 font-serif text-base font-bold text-amber-300">
            A
          </div>
          <span className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-300">
            Apsara
          </span>
        </div>

        {/* AuthForm Container */}
        <div className="relative z-10 flex w-full justify-center">
          {children}
        </div>

        {/* Minimal Footer */}
        <React.Suspense
          fallback={
            <footer className="relative z-10 mt-10 text-center text-xs text-neutral-500">
              &copy; Apsara. All rights reserved.
            </footer>
          }
        >
          <CopyrightFooter />
        </React.Suspense>
      </main>
    </div>
  );
}
