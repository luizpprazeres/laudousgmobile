import type { Config } from "tailwindcss";

// Scaffold S0: config mínima e autossuficiente. No S1 portamos os design-tokens
// completos de ~/laudousg/lib/design-tokens para casar 1:1 com a landing original.
const config: Config = {
  darkMode: "class",
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
