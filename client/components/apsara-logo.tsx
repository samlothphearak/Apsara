export function ApsaraLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="inline-flex items-center gap-3">
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/30 bg-gradient-to-b from-amber-500/15 via-neutral-900 to-neutral-950 shadow-[0_0_20px_rgba(245,158,11,0.18)]">
        <div className="absolute inset-1 rounded-lg border border-amber-300/15" />
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 drop-shadow-[0_2px_6px_rgba(251,191,36,0.4)]"
        >
          <defs>
            <linearGradient
              id="apsaraGoldMini"
              x1="12"
              y1="6"
              x2="52"
              y2="58"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#FDE68A" />
              <stop offset="45%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#B45309" />
            </linearGradient>
          </defs>
          <path
            d="M14 42C10.5 36.5 10.5 28.5 14.5 22.5C19 15.8 25.5 13 32 13C38.5 13 45 15.8 49.5 22.5C53.5 28.5 53.5 36.5 50 42"
            stroke="url(#apsaraGoldMini)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeDasharray="2 3"
          />
          <path d="M32 6L34.2 13.5H29.8L32 6Z" fill="url(#apsaraGoldMini)" />
          <path
            d="M27.5 16.5H36.5L38 20H26L27.5 16.5Z"
            fill="url(#apsaraGoldMini)"
          />
          <path
            d="M24.5 21.5H39.5L41 24.5H23L24.5 21.5Z"
            fill="url(#apsaraGoldMini)"
          />
          <path
            d="M27 26C27 29.5 29.2 32.5 32 32.5C34.8 32.5 37 29.5 37 26"
            stroke="url(#apsaraGoldMini)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M20 49C24 46.5 28 45.5 32 45.5C36 45.5 40 46.5 44 49C40 51.5 36 52.5 32 52.5C28 52.5 24 51.5 20 49Z"
            stroke="url(#apsaraGoldMini)"
            strokeWidth="1.8"
            fill="url(#apsaraGoldMini)"
            fillOpacity="0.25"
          />
        </svg>
      </div>

      {!compact && (
        <div>
          <span className="block text-sm font-semibold uppercase tracking-[0.28em] text-amber-300">
            Apsara
          </span>
          <span className="block text-[10px] uppercase tracking-[0.2em] text-neutral-500">
            Celestial Sanctuary
          </span>
        </div>
      )}
    </div>
  );
}
