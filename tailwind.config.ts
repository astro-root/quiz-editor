import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px -12px rgba(79, 70, 229, 0.18)",
        pop: "0 2px 4px rgba(15, 23, 42, 0.06), 0 16px 40px -16px rgba(79, 70, 229, 0.28)",
      },
    },
  },
  plugins: [],
};
export default config;
