import { ImageResponse } from "next/og";

export function generateImageMetadata() {
  return [
    {
      contentType: "image/png",
      size: { width: 32, height: 32 },
      id: "small",
    },
    {
      contentType: "image/png",
      size: { width: 192, height: 192 },
      id: "medium",
    },
    {
      contentType: "image/png",
      size: { width: 512, height: 512 },
      id: "large",
    },
  ];
}

export default function Icon({ id }: { id: string }) {
  const dimension = id === "small" ? 32 : id === "medium" ? 192 : 512;
  const svgSize = Math.round(dimension * 0.78);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: id === "small" ? "8px" : "24%",
        background: "#09090B",
        border:
          id === "small"
            ? "1px solid rgba(245, 158, 11, 0.4)"
            : "4px solid rgba(245, 158, 11, 0.35)",
      }}
    >
      <svg
        width={svgSize}
        height={svgSize}
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

        <path
          d="M14 42C10.5 36.5 10.5 28.5 14.5 22.5C19 15.8 25.5 13 32 13C38.5 13 45 15.8 49.5 22.5C53.5 28.5 53.5 36.5 50 42"
          stroke="url(#apsaraGold)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeDasharray="2 3"
        />
        <path d="M32 6L34.2 13.5H29.8L32 6Z" fill="url(#apsaraGold)" />
        <path d="M27.5 16.5H36.5L38 20H26L27.5 16.5Z" fill="url(#apsaraGold)" />
        <path
          d="M24.5 21.5H39.5L41 24.5H23L24.5 21.5Z"
          fill="url(#apsaraGold)"
        />
        <path
          d="M27 26C27 29.5 29.2 32.5 32 32.5C34.8 32.5 37 29.5 37 26"
          stroke="url(#apsaraGold)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M26 36.5C21 37.5 16.5 35.5 14.5 31.5C13.8 30 14.5 28.5 15.8 28.8"
          stroke="url(#apsaraGold)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M38 36.5C43 37.5 47.5 35.5 49.5 31.5C50.2 30 49.5 28.5 48.2 28.8"
          stroke="url(#apsaraGold)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M20 49C24 46.5 28 45.5 32 45.5C36 45.5 40 46.5 44 49C40 51.5 36 52.5 32 52.5C28 52.5 24 51.5 20 49Z"
          stroke="url(#apsaraGold)"
          strokeWidth="1.8"
          fill="url(#apsaraGold)"
          fillOpacity="0.25"
        />
      </svg>
    </div>,
    {
      width: dimension,
      height: dimension,
    },
  );
}
