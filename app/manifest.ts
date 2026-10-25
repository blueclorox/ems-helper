import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/ems-helper/",
    name: "EMS Helper",
    short_name: "EMS Helper",
    description: "EMS 접수와 고객 안내를 위한 업무 보조 앱",
    start_url: "/ems-helper/",
    scope: "/ems-helper/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#14532d",
    icons: [
      {
        src: "/ems-helper/ems-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}