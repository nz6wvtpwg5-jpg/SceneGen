import type { Config } from "tailwindcss"

export default {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/pages/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Legacy HSL variables (keep for backward compatibility during transition)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },

        // NEW: Premium Dark SaaS Design Tokens
        'bg-primary': '#f2ede3',
        'bg-secondary': '#e9e2d6',
        'bg-surface': '#fbf8f1',
        'bg-elevated': '#ffffff',

        'text-primary': '#151713',
        'text-secondary': '#565a52',
        'text-muted': '#85887f',

        'border-soft': 'rgba(28, 31, 26, 0.14)',
        'border-glow': 'rgba(255, 90, 54, 0.32)',

        'accent-cyan': '#ff5a36',
        'accent-blue': '#e54525',
        'accent-indigo': '#23271f',
        'accent-purple': '#9bbd18',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        // NEW: Premium rounded corners
        'xl': '16px',
        '2xl': '20px',
        '3xl': '28px',
        '4xl': '32px',
      },
      boxShadow: {
        'panel': '0 12px 30px rgba(31, 27, 20, 0.08)',
        'glow': '0 0 0 1px rgba(255, 90, 54, 0.16), 0 12px 34px rgba(31, 27, 20, 0.1)',
        'glow-lg': '0 0 0 1px rgba(255, 90, 54, 0.22), 0 20px 54px rgba(31, 27, 20, 0.14)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(90deg, #ff5a36 0%, #e54525 100%)',
        'gradient-accent': 'linear-gradient(90deg, #ff5a36 0%, #e54525 100%)',
        'gradient-surface': 'linear-gradient(180deg, #fffdf8 0%, #f5efe4 100%)',
      },
    },
  },
  plugins: [],
} satisfies Config
