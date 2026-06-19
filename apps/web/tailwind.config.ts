import type { Config } from 'tailwindcss'
import { palette, fonts, typeScale, space, radii, shadows, breakpoints, zIndex } from './src/lib/design-tokens'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    screens: breakpoints,
    extend: {
      colors: {
        emerald: palette.emerald,
        gray: palette.gray,
        red: palette.red,
        amber: palette.amber,
        green: palette.green,
        yellow: palette.yellow,
        blue: palette.blue,
        slate: palette.slate,
      },
      fontFamily: {
        sans: [fonts.sans.family, ...fonts.sans.fallback.split(', ')],
        barlow: [`var(${fonts.display.cssVar})`, fonts.display.fallback],
      },
      fontSize: Object.fromEntries(
        Object.entries(typeScale).map(([k, v]) => [k, [v.size, { lineHeight: v.lineHeight }]])
      ),
      spacing: space,
      borderRadius: radii,
      boxShadow: shadows,
      zIndex: Object.fromEntries(
        Object.entries(zIndex).map(([k, v]) => [k, String(v)])
      ),
    },
  },
  plugins: [],
}

export default config
