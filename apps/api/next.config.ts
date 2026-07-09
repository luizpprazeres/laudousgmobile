import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // packages do monorepo são transpilados pelo Next
  transpilePackages: ["@laudousg/shared", "@laudousg/db", "@laudousg/schemes"],
  // libs Node-only que não devem ser bundleadas para o cliente
  serverExternalPackages: ["postgres", "drizzle-orm"],
  typescript: {
    // node-linker=hoisted (necessário pro Expo Web em monorepo pnpm) faz
    // @types/react 18.x do apps/mobile ser visto pelo apps/api, conflitando
    // com React 19.x. tsc local falha em layout.tsx mas o build runtime
    // funciona. TODO: resolver via two-level monorepo ou migrar Expo SDK
    // que suporte React 19 (Expo SDK 53+).
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PATCH, PUT, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Authorization, Content-Type, Accept, X-Requested-With" },
          { key: "Access-Control-Max-Age", value: "86400" },
        ],
      },
    ];
  },
  // Quando o host é sala.laudousg.com, a raiz "/" serve a tela de pareamento
  // da Sala do Auxiliar (que vive em /sala). Restantes rotas seguem normais.
  async rewrites() {
    return [
      {
        source: "/",
        has: [{ type: "host", value: "sala.laudousg.com" }],
        destination: "/sala",
      },
    ];
  },
};

export default nextConfig;
