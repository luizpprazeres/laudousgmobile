import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // packages do monorepo são transpilados pelo Next
  transpilePackages: ["@laudousg/shared", "@laudousg/db"],
  experimental: {
    // libs Node-only que não devem ser bundleadas para o cliente
    serverComponentsExternalPackages: ["postgres", "drizzle-orm"],
  },
};

export default nextConfig;
