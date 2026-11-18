import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(145deg, #121216 0%, #060608 100%)",
      }}
    >
      <svg
        width="136"
        height="136"
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient
            id="apsaraGold"
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

        {/* Sacred Halo Arch */}
        <path
          d="M14 42C10.5 36.5 10.5 28.5 14.5 22.5C19 15.8 25.5 13 32 13C38.5 13 45 15.8 49.5 22.5C53.5 28.5 53.5 36.5 50 42"
          stroke="url(#apsaraGold)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="2 3"
        />

        {/* Tiered Khmer Spire Crown (Mokot) */}
        <path d="M32 6L34.2 13.5H29.8L32 6Z" fill="url(#apsaraGold)" />
        <path d="M27.5 16.5H36.5L38 20H26L27.5 16.5Z" fill="url(#apsaraGold)" />
        <path
          d="M24.5 21.5H39.5L41 24.5H23L24.5 21.5Z"
          fill="url(#apsaraGold)"
        />

        {/* Graceful Apsara Face & Headpiece */}
        <path
          d="M27 26C27 29.5 29.2 32.5 32 32.5C34.8 32.5 37 29.5 37 26"
          stroke="url(#apsaraGold)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        {/* Ornate Ear & Shoulder Drapes */}
        <path
          d="M23.5 25.5C21.5 27.5 21 30.5 22.5 33"
          stroke="url(#apsaraGold)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M40.5 25.5C42.5 27.5 43 30.5 41.5 33"
          stroke="url(#apsaraGold)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Dancing Graceful Arms & Mudra */}
        <path
          d="M26 36.5C21 37.5 16.5 35.5 14.5 31.5C13.8 30 14.5 28.5 15.8 28.8"
          stroke="url(#apsaraGold)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M38 36.5C43 37.5 47.5 35.5 49.5 31.5C50.2 30 49.5 28.5 48.2 28.8"
          stroke="url(#apsaraGold)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        {/* Royal Collar */}
        <path
          d="M26.5 36.5L32 41L37.5 36.5"
          stroke="url(#apsaraGold)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Lotus Pedestal Base */}
        <path
          d="M20 49C24 46.5 28 45.5 32 45.5C36 45.5 40 46.5 44 49C40 51.5 36 52.5 32 52.5C28 52.5 24 51.5 20 49Z"
          stroke="url(#apsaraGold)"
          strokeWidth="1.6"
          fill="url(#apsaraGold)"
          fillOpacity="0.2"
        />
        <path
          d="M25 54.5C27.5 55.8 29.8 56.5 32 56.5C34.2 56.5 36.5 55.8 39 54.5"
          stroke="url(#apsaraGold)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </div>,
    {
      ...size,
    },
  );
}
