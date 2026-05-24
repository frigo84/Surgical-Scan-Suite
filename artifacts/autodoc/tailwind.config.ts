import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          900: "#060d1a",
          800: "#0c1526",
          700: "#101d33",
          600: "#172440",
          500: "#1e2f52",
        },
        accent: {
          DEFAULT: "#38bdf8",
          dim: "#0ea5e9",
          glow: "rgba(56,189,248,0.15)",
        },
        success: "#34d399",
        warning: "#fbbf24",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
