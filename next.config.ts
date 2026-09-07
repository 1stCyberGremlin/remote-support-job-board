import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/remote-support-job-board",
  assetPrefix: "/remote-support-job-board",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
