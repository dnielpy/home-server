import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@home-server/contracts", "@home-server/core"],
};

export default nextConfig;
