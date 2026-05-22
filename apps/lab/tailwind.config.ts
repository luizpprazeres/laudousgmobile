import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#ECFDF5",
          100: "#D1FAE5",
          200: "#A7F3D0",
          300: "#6EE7B7",
          400: "#34D399",
          500: "#10B981",
          600: "#059669",
          700: "#047857",
          800: "#065F46",
          900: "#064E3B",
          ink: "#18533F",
        },
        primary: "#059669",
        primaryDeep: "#065F46",
        primarySoft: "#D1FAE5",
        primaryTint: "#ECFDF5",
        wordmark: "#18533F",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-barlow)", "Barlow", "Inter", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 1px rgba(15, 23, 42, 0.03)",
        cardHover: "0 4px 12px rgba(6, 95, 70, 0.06), 0 2px 4px rgba(15, 23, 42, 0.04)",
        pop: "0 12px 32px -8px rgba(6, 95, 70, 0.18), 0 4px 8px rgba(15, 23, 42, 0.06)",
      },
      letterSpacing: {
        widest: ".18em",
      },
    },
  },
  plugins: [forms],
};

export default config;
