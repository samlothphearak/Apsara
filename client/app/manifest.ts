import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Apsara — Celestial Sanctuary",
    short_name: "Apsara",
    description: "Crafted for those who value elegance in every detail.",
    start_url: "/",
    display: "standalone",
    background_color: "#070709",
    theme_color: "#070709",
    icons: [
      {
        src: "/icon/medium",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon/large",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}