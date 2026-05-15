import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // packages do monorepo são transpilados pelo Next
  transpilePackages: ["@laudousg/shared", "@laudousg/db"],
  experimental: {
    // libs Node-only que não devem ser bundleadas para o cliente
    serverComponentsExternalPackages: ["postgres", "drizzle-orm"],
  },
  typescript: {
    // node-linker=hoisted (necessário pro Expo Web em monorepo pnpm) faz
    // @types/react 18.x do apps/mobile ser visto pelo apps/api, conflitando
    // com React 19.x. tsc local falha em layout.tsx mas o build runtime
    // funciona. TODO: resolver via two-level monorepo ou migrar Expo SDK
    // que suporte React 19 (Expo SDK 53+).
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
