import type { Config } from "tailwindcss";

// ダークテーマ。既存の bg-slate-* / text-slate-* などのクラス名はそのままに、色の値だけを差し替えている。
//  slate : 50=ページ背景 / 100,200=区切り・チップ / 300〜500=薄い文字 / 600〜900=本文・見出し（明るい順）
//  surface : カードや入力欄の面（旧 bg-white）
//  accent  : 暗い背景上のブランド色の文字（旧 text-brand-*）。ボタンの背景は brand のまま
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        surface: "#121821",
        accent: { DEFAULT: "#a5b4fc", strong: "#c7d2fe", dim: "#818cf8" },
        slate: {
          50: "#0d1218",
          100: "#171e29",
          200: "#273142",
          300: "#566175",
          400: "#8793a5",
          500: "#9ba6b8",
          600: "#b4bdcc",
          700: "#d4dae4",
          800: "#e6eaf1",
          900: "#f4f6fa",
        },
        brand: {
          50: "#1a1e3d",
          100: "#2a3068",
          200: "#343b78",
          300: "#4a53a8",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
        },
        rose: { 50: "#2a1319", 100: "#3a1822", 200: "#5c2430", 300: "#8a3446" },
        amber: { 50: "#2b2210", 100: "#3a2d12", 200: "#5c4616", 300: "#8a6a1f" },
        emerald: { 50: "#10261d", 100: "#133224", 200: "#1b4d37", 300: "#287a56" },
        sky: { 50: "#0f2230", 100: "#122c3f", 200: "#1b4560", 300: "#2a6a92" },
        violet: { 50: "#1e1a33", 100: "#2a2347", 200: "#3d3366", 300: "#5b4d99" },
      },
      boxShadow: {
        card: "0 1px 2px rgba(0, 0, 0, 0.4), 0 8px 24px -12px rgba(0, 0, 0, 0.6)",
        pop: "0 2px 4px rgba(0, 0, 0, 0.45), 0 16px 40px -16px rgba(0, 0, 0, 0.7)",
      },
    },
  },
  plugins: [],
};
export default config;
