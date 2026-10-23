"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";

export type ThemePref = "system" | "light" | "dark";
export const THEME_KEY = "qraft:theme";
export const DEFAULT_THEME: ThemePref = "dark";

// <head> に埋め込む初期化スクリプト（画面が描かれる前にテーマを決め、ちらつきを防ぐ）。
// 固定の文字列で、ユーザー入力は含まない。
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem("${THEME_KEY}")||"${DEFAULT_THEME}";var d=p==="dark"||(p==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";}catch(e){document.documentElement.dataset.theme="${DEFAULT_THEME}";}})();`;

interface ThemeCtx {
  preference: ThemePref;
  resolved: "light" | "dark";
  setPreference: (p: ThemePref) => void;
}
const Ctx = createContext<ThemeCtx | null>(null);

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === "system" || v === "light" || v === "dark") return v;
  } catch { /* localStorage が使えない環境では既定値 */ }
  return DEFAULT_THEME;
}
const systemDark = () => typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPref] = useState<ThemePref>(DEFAULT_THEME);
  const [resolved, setResolved] = useState<"light" | "dark">("dark");

  const apply = useCallback((p: ThemePref) => {
    const r = p === "system" ? (systemDark() ? "dark" : "light") : p;
    document.documentElement.dataset.theme = r;
    setResolved(r);
  }, []);

  // 初回：保存済みの設定を読む
  useEffect(() => {
    const p = readPref();
    setPref(p);
    apply(p);
  }, [apply]);

  // 「システムに合わせる」のとき、OS側の切り替えに追従する
  useEffect(() => {
    if (preference !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const h = () => apply("system");
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, [preference, apply]);

  // 別のタブでの変更に追従する
  useEffect(() => {
    const h = (e: StorageEvent) => {
      if (e.key !== THEME_KEY) return;
      const p = readPref();
      setPref(p);
      apply(p);
    };
    window.addEventListener("storage", h);
    return () => window.removeEventListener("storage", h);
  }, [apply]);

  const setPreference = useCallback((p: ThemePref) => {
    try { localStorage.setItem(THEME_KEY, p); } catch { /* 保存できなくても、このタブでは反映する */ }
    setPref(p);
    apply(p);
  }, [apply]);

  return <Ctx.Provider value={{ preference, resolved, setPreference }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTheme must be used within ThemeProvider");
  return v;
}
