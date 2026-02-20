import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dae6ff",
          200: "#bdd4ff",
          300: "#90b8ff",
          400: "#6196ff",
          500: "#3269ff",
          600: "#1a46f5",
          700: "#1334e1",
          800: "#162cb6",
          900: "#182a8f",
          950: "#131d57",
        },
        surface: {
          50: "#f8f9fc",
          100: "#f1f3f8",
          200: "#e5e7ef",
          300: "#d1d5e0",
          400: "#9ca3b4",
          500: "#6b7280",
          600: "#4a5568",
          700: "#374151",
          800: "#1f2937",
          900: "#111827",
        },
        accent: {
          emerald: "#10b981",
          amber: "#f59e0b",
          rose: "#f43f5e",
          violet: "#8b5cf6",
        },
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-instrument-serif)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
