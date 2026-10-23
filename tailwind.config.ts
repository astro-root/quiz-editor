import type { Config } from "tailwindcss";

// 色は globals.css の CSS 変数で定義し、ライト/ダークは <html data-theme="..."> で切り替える。
// クラス名は従来のまま（bg-slate-50 など）。役割ごとの名前は次のとおり。
//  surface        : カード・入力欄の面（旧 bg-white）
//  accent         : ブランド色の「文字」（ボタンの背景は brand-*）
//  danger/ok/warn/info/tag : 状態を表す「文字」の色（エラー・成功・注意・情報・Round表示）
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        surface: "rgb(var(--surface) / <alpha-value>)",
        accent: { DEFAULT: "rgb(var(--accent) / <alpha-value>)", strong: "rgb(var(--accent-strong) / <alpha-value>)", dim: "rgb(var(--accent-dim) / <alpha-value>)" },
        danger: "rgb(var(--danger) / <alpha-value>)",
        ok: "rgb(var(--ok) / <alpha-value>)",
        warn: { DEFAULT: "rgb(var(--warn) / <alpha-value>)", strong: "rgb(var(--warn-strong) / <alpha-value>)" },
        info: "rgb(var(--info) / <alpha-value>)",
        tag: "rgb(var(--tag) / <alpha-value>)",
        slate: { 50: "rgb(var(--slate-50) / <alpha-value>)", 100: "rgb(var(--slate-100) / <alpha-value>)", 200: "rgb(var(--slate-200) / <alpha-value>)", 300: "rgb(var(--slate-300) / <alpha-value>)", 400: "rgb(var(--slate-400) / <alpha-value>)", 500: "rgb(var(--slate-500) / <alpha-value>)", 600: "rgb(var(--slate-600) / <alpha-value>)", 700: "rgb(var(--slate-700) / <alpha-value>)", 800: "rgb(var(--slate-800) / <alpha-value>)", 900: "rgb(var(--slate-900) / <alpha-value>)" },
        brand: { 50: "rgb(var(--brand-50) / <alpha-value>)", 100: "rgb(var(--brand-100) / <alpha-value>)", 200: "rgb(var(--brand-200) / <alpha-value>)", 300: "rgb(var(--brand-300) / <alpha-value>)", 400: "rgb(var(--brand-400) / <alpha-value>)", 500: "rgb(var(--brand-500) / <alpha-value>)", 600: "rgb(var(--brand-600) / <alpha-value>)", 700: "rgb(var(--brand-700) / <alpha-value>)" },
        rose: { 50: "rgb(var(--rose-50) / <alpha-value>)", 100: "rgb(var(--rose-100) / <alpha-value>)", 200: "rgb(var(--rose-200) / <alpha-value>)", 300: "rgb(var(--rose-300) / <alpha-value>)" },
        amber: { 50: "rgb(var(--amber-50) / <alpha-value>)", 100: "rgb(var(--amber-100) / <alpha-value>)", 200: "rgb(var(--amber-200) / <alpha-value>)", 300: "rgb(var(--amber-300) / <alpha-value>)" },
        emerald: { 50: "rgb(var(--emerald-50) / <alpha-value>)", 100: "rgb(var(--emerald-100) / <alpha-value>)", 200: "rgb(var(--emerald-200) / <alpha-value>)", 300: "rgb(var(--emerald-300) / <alpha-value>)" },
        sky: { 50: "rgb(var(--sky-50) / <alpha-value>)", 100: "rgb(var(--sky-100) / <alpha-value>)", 200: "rgb(var(--sky-200) / <alpha-value>)", 300: "rgb(var(--sky-300) / <alpha-value>)" },
        violet: { 50: "rgb(var(--violet-50) / <alpha-value>)", 100: "rgb(var(--violet-100) / <alpha-value>)", 200: "rgb(var(--violet-200) / <alpha-value>)", 300: "rgb(var(--violet-300) / <alpha-value>)" },
      },
      boxShadow: {
        card: "var(--shadow-card)",
        pop: "var(--shadow-pop)",
      },
    },
  },
  plugins: [],
};
export default config;
