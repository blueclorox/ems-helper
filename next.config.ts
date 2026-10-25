import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/ems-helper",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;