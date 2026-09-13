import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAF6EE",
        card: "#FFFDF7",
        ink: {
          DEFAULT: "#202A3B",
          soft: "#5B6478",
          faint: "#8B93A3",
        },
        stamp: {
          DEFAULT: "#B23A2E",
          soft: "#D9CFC0",
        },
        moss: {
          DEFAULT: "#3F6B54",
          soft: "#E4ECE6",
        },
        kraft: {
          DEFAULT: "#E7DCC3",
          dark: "#CBB98F",
          line: "#DED0AF",
        },
      },
      fontFamily: {
        mincho: [
          '"Hiragino Mincho ProN"',
          '"Yu Mincho"',
          '"MS Mincho"',
          "serif",
        ],
        gothic: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Hiragino Kaku Gothic ProN"',
          '"Yu Gothic"',
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
