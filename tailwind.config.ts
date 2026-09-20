import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        sand: {
          50: "#FBF8F3",
          100: "#F5EFE6",
          200: "#E8DCC8",
          300: "#D4C2A4",
        },
        wine: {
          DEFAULT: "#6B2E3A",
          soft: "#8A4452",
          700: "#6B2E3A",
          800: "#4A1C2A",
        },
        gold: {
          DEFAULT: "#C6A05A",
          soft: "#E0C48A",
          500: "#C6A05A",
          600: "#A8843E",
        },
        ink: {
          DEFAULT: "#2C241C",
          soft: "#5A4E44",
          900: "#2C241C",
          700: "#5A4E44",
        },
        canvas: {
          DEFAULT: "#F3EBE0",
          deep: "#E9DFD0",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        chat: ["var(--font-chat)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "soft-pulse": {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
        },
        "amem-presence-pulse": {
          "0%, 100%": {
            opacity: "0.85",
            boxShadow: "0 0 0 0 var(--amem-gold-120)",
          },
          "50%": {
            opacity: "1",
            boxShadow: "0 0 0 10px transparent",
          },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s ease-out both",
        "fade-up-delayed": "fade-up 0.8s ease-out 0.15s both",
        "soft-pulse": "soft-pulse 2.4s ease-in-out infinite",
        "amem-presence-pulse":
          "amem-presence-pulse var(--amem-dur-ritual) var(--amem-ease-presence) infinite",
      },
      fontSize: {
        "amem-body": ["var(--amem-text-body)", { lineHeight: "var(--amem-leading-body)" }],
        "amem-soft": ["var(--amem-text-soft)", { lineHeight: "1.4" }],
        "amem-eyebrow": [
          "var(--amem-text-eyebrow)",
          { lineHeight: "1.3", letterSpacing: "0.14em", fontWeight: "700" },
        ],
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
