import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cozy/warm Stardrop palette
        terracotta: {
          50: "#fdf6f1",
          100: "#fae9dd",
          200: "#f4d0b6",
          300: "#ecb087",
          400: "#e28d5c",
          500: "#d56f3e",
          600: "#c25831",
          700: "#a1442b",
          800: "#823829",
          900: "#6b3025",
        },
        sage: {
          50: "#f4f7f2",
          100: "#e5ede0",
          200: "#cadbc1",
          300: "#a4c197",
          400: "#7ca36e",
          500: "#5d8753",
          600: "#476c40",
          700: "#395735",
          800: "#2f472d",
          900: "#283b27",
        },
        cream: {
          50: "#fefcf8",
          100: "#fbf6ea",
          200: "#f6ecd1",
          300: "#efdfb1",
          400: "#e6cd87",
          500: "#dbb961",
        },
        wood: {
          50: "#faf6f1",
          100: "#f1e8db",
          200: "#e1cfb3",
          300: "#cdb088",
          400: "#b89066",
          500: "#a17651",
          600: "#876043",
          700: "#6e4d39",
          800: "#5b4030",
          900: "#4c362a",
        },
      },
      fontFamily: {
        // We'll wire up the actual fonts in app/layout.tsx
        serif: ["var(--font-lora)", "Lora", "Georgia", "serif"],
        sans: ["var(--font-inter-tight)", "Inter Tight", "system-ui", "sans-serif"],
      },
      borderRadius: {
        cozy: "0.75rem",
      },
      boxShadow: {
        cozy: "0 2px 8px rgba(107, 48, 37, 0.08), 0 1px 2px rgba(107, 48, 37, 0.04)",
        "cozy-lg": "0 8px 24px rgba(107, 48, 37, 0.1), 0 2px 6px rgba(107, 48, 37, 0.05)",
      },
    },
  },
  plugins: [],
};

export default config;