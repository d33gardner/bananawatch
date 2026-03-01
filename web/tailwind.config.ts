import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        // Friendly, patient-focused primary (teal)
        primary: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
        },
        // Warm neutrals (stone) for surfaces and text
        surface: {
          DEFAULT: "#ffffff",
          muted: "#fafaf9", // warm off-white page background
        },
        muted: {
          DEFAULT: "#78716c",
          foreground: "#a8a29e",
        },
        // Softer status for decay/health (traffic light, less alarming)
        status: {
          critical: "#dc2626",
          warning: "#ea580c",
          success: "#16a34a",
        },
      },
      borderRadius: {
        card: "0.75rem",
        button: "0.5rem",
      },
    },
  },
  plugins: [],
};
export default config;
