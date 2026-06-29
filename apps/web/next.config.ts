import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    // Alinhado ao apps/api: o typecheck roda via `pnpm typecheck`, não no build.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
