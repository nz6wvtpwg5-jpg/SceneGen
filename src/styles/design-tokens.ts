/**
 * SceneGen Premium Dark SaaS Design Tokens
 *
 * Centralized design system tokens for programmatic access.
 * Use these when you need to access design values in JavaScript/TypeScript.
 * For Tailwind classes, use the utility classes directly.
 */

export const colors = {
  bg: {
    primary: '#05070B',
    secondary: '#0B1018',
    surface: '#101722',
    elevated: '#151C2B',
  },
  text: {
    primary: '#F3F7FF',
    secondary: 'rgba(255, 255, 255, 0.72)',
    muted: 'rgba(255, 255, 255, 0.48)',
  },
  border: {
    soft: 'rgba(120, 180, 255, 0.18)',
    glow: 'rgba(56, 189, 248, 0.28)',
  },
  accent: {
    cyan: '#38BDF8',
    blue: '#3B82F6',
    indigo: '#6366F1',
    purple: '#A855F7',
  },
} as const

export const gradients = {
  primary: 'linear-gradient(90deg, #22C1EE 0%, #4F7CFF 50%, #A855F7 100%)',
  accent: 'linear-gradient(90deg, #22C1EE 0%, #3B82F6 45%, #A855F7 100%)',
  surface: 'linear-gradient(180deg, rgba(19, 25, 37, 0.92), rgba(13, 18, 28, 0.96))',
  radial: 'radial-gradient(circle at 50% 0%, rgba(56, 189, 248, 0.15), transparent 70%)',
} as const

export const shadows = {
  panel: '0 10px 30px rgba(0, 0, 0, 0.35)',
  glow: '0 0 0 1px rgba(90, 160, 255, 0.22), 0 12px 40px rgba(49, 130, 246, 0.18)',
  glowLg: '0 0 0 1px rgba(90, 160, 255, 0.28), 0 20px 60px rgba(49, 130, 246, 0.22)',
  inset: 'inset 0 1px 0 rgba(255, 255, 255, 0.03)',
} as const

export const borderRadius = {
  xl: '16px',
  '2xl': '20px',
  '3xl': '28px',
  '4xl': '32px',
} as const

export const spacing = {
  section: '4rem',
  card: '1.5rem',
  component: '1rem',
} as const

export const typography = {
  fontFamily: {
    sans: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  },
  fontSize: {
    h1: '3.75rem',      // 60px
    h2: '3rem',         // 48px
    h3: '2.25rem',      // 36px
    h4: '1.875rem',     // 30px
    h5: '1.5rem',       // 24px
    h6: '1.25rem',      // 20px
    body: '1rem',       // 16px
    small: '0.875rem',  // 14px
    xs: '0.75rem',      // 12px
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const

export const transitions = {
  fast: '150ms ease',
  normal: '200ms ease',
  slow: '300ms ease',
} as const

// Type exports for autocompletion
export type ColorKey = keyof typeof colors
export type GradientKey = keyof typeof gradients
export type ShadowKey = keyof typeof shadows
