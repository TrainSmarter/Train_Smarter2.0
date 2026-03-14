import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Train Smarter",
    short_name: "Train Smarter",
    description:
      "Professionelle Trainingsmanagement-Plattform für Trainer und Athleten",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0D9488",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
