// Configuração para suportar workspaces pnpm + monorepo (Expo + Metro)
const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch the entire monorepo
config.watchFolders = [workspaceRoot];

// 2. Resolver: lookup em ambos node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// 3. Permitir resolução de packages workspace
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
