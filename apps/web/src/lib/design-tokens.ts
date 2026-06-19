/**
 * Design tokens — Single Source of Truth.
 *
 * Mudou um valor aqui? Reflete em:
 *   - tailwind.config.ts (que importa daqui)
 *   - /admin/design-system (que renderiza valores daqui)
 *   - Design Studio (Sub-projeto B fará essa integração)
 *
 * Princípio: aliases referenciam, não copiam.
 *   colors.brand.primary aponta para palette.emerald[600] — mude a paleta, brand acompanha.
 *
 * Spec: docs/superpowers/specs/2026-04-26-design-system-foundation-design.md
 */

const palette = {
  emerald: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
  },
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712',
  },
  red: { 50: '#fef2f2', 200: '#fecaca', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c' },
  amber: { 50: '#fffbeb', 200: '#fde68a', 600: '#d97706', 700: '#b45309', 800: '#92400e' },
  green: { 50: '#f0fdf4', 200: '#bbf7d0', 700: '#15803d' },
  yellow: { 50: '#fefce8', 200: '#fef08a', 800: '#854d0e' },
  blue: { 600: '#2563eb' },
  slate: { 50: '#f8fafc' },
} as const

export { palette }

export const colors = {
  ...palette,
  brand: {
    primary: palette.emerald[600],
    primaryHover: palette.emerald[700],
    primarySoft: palette.emerald[200],
    primaryBg: palette.emerald[50],
  },
  semantic: {
    success: palette.emerald[600],
    successBg: palette.emerald[50],
    warning: palette.amber[600],
    warningBg: palette.amber[50],
    error: palette.red[600],
    errorBg: palette.red[50],
    info: palette.blue[600],
  },
  surface: {
    default: '#ffffff',
    muted: palette.gray[50],
    inverse: palette.gray[900],
    overlay: 'rgba(0, 0, 0, 0.4)',
  },
  text: {
    primary: palette.gray[900],
    secondary: palette.gray[600],
    muted: palette.gray[400],
    onBrand: '#ffffff',
    onInverse: '#ffffff',
  },
  border: {
    default: palette.gray[200],
    strong: palette.gray[400],
    focus: palette.emerald[600],
  },
} as const

export const fonts = {
  sans: {
    family: 'Inter',
    fallback: '-apple-system, system-ui, sans-serif',
    weights: [400, 500, 600, 700],
  },
  display: {
    family: 'Barlow',
    cssVar: '--font-barlow',
    fallback: 'sans-serif',
    weights: [400, 500, 600, 700, 800],
  },
} as const

export const typeScale = {
  xs:   { size: '0.75rem',  lineHeight: '1rem' },     // 12 / 16
  sm:   { size: '0.875rem', lineHeight: '1.25rem' },  // 14 / 20
  base: { size: '1rem',     lineHeight: '1.5rem' },   // 16 / 24
  lg:   { size: '1.125rem', lineHeight: '1.75rem' },  // 18 / 28
  xl:   { size: '1.25rem',  lineHeight: '1.75rem' },  // 20 / 28
  '2xl': { size: '1.5rem',   lineHeight: '2rem' },    // 24 / 32
  '3xl': { size: '1.875rem', lineHeight: '2.25rem' }, // 30 / 36
  '4xl': { size: '2.25rem',  lineHeight: '2.5rem' },  // 36 / 40
  '5xl': { size: '3rem',     lineHeight: '1' },       // 48
} as const

export const space = {
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  6: '1.5rem',
  8: '2rem',
  12: '3rem',
  16: '4rem',
  24: '6rem',
} as const

export const radii = {
  sm: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  '3xl': '1.5rem',
  full: '9999px',
} as const

export const shadows = {
  sm: '0 1px 2px 0 rgba(0,0,0,0.05)',
  md: '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.04)',
  lg: '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -2px rgba(0,0,0,0.04)',
  xl: '0 20px 25px -5px rgba(0,0,0,0.10), 0 10px 10px -5px rgba(0,0,0,0.04)',
  cardHover: '0 4px 16px -2px rgba(0,0,0,0.08), 0 2px 6px -1px rgba(0,0,0,0.04)',
} as const

export const motion = {
  duration: {
    fast: '100ms',
    base: '150ms',
    slow: '200ms',
    slower: '300ms',
  },
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
  },
  animations: ['fadeIn', 'slideIn', 'btnPress'] as const,
} as const

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const

export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  modal: 50,
  toast: 60,
} as const

export const brand = {
  logos: [
    { id: 'transparent', label: 'Transparent', src: '/brand/logo-laudousg-transparent.png', useOn: 'light' as const },
    { id: 'white',       label: 'White',       src: '/brand/logo-laudousg-white.png',       useOn: 'dark' as const },
    { id: 'main',        label: 'Main',        src: '/brand/logo-laudousg-main.png',        useOn: 'any' as const },
    { id: 'gold',        label: 'Gold',        src: '/brand/logo-gold.png',                 useOn: 'premium' as const },
    { id: 'mockup',      label: 'Mockup',      src: '/brand/logo-laudousg-mockup.png',      useOn: 'context' as const },
    { id: 'mockups',     label: 'Mockups',     src: '/brand/logo-mockups.png',              useOn: 'context' as const },
  ],
  primaryLogoPath: '/brand/logo-laudousg-transparent.png',
} as const

// Tipos derivados
export type SemanticColor = keyof typeof colors.semantic
export type SurfaceToken = keyof typeof colors.surface
export type TextToken = keyof typeof colors.text
export type BorderToken = keyof typeof colors.border
export type SpaceToken = keyof typeof space
export type RadiiToken = keyof typeof radii
export type ShadowToken = keyof typeof shadows
export type ZIndexToken = keyof typeof zIndex
export type LogoVariant = typeof brand.logos[number]
