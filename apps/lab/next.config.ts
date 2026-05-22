import path from "node:path";
import type { NextConfig } from "next";

const monorepoRoot = path.join(__dirname, "..", "..");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@laudousg/shared", "@laudousg/db", "@laudousg/knowledge"],
  serverExternalPackages: ["postgres", "drizzle-orm"],
  outputFileTracingRoot: monorepoRoot,
  outputFileTracingIncludes: {
    "/changelog": ["./docs/changelog/**/*.md"],
    "/changelog/**": ["./docs/changelog/**/*.md"],
    "/blocks": ["./packages/knowledge/snippets/**/*.md"],
    "/blocks/**": ["./packages/knowledge/snippets/**/*.md"],
    "/api/blocks/**": ["./packages/knowledge/snippets/**/*.md"],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
