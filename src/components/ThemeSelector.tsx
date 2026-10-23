"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { ThemePref, useTheme } from "@/lib/theme";

const options: { value: ThemePref; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "システムに合わせる", icon: Monitor },
  { value: "light", label: "ライト", icon: Sun },
  { value: "dark", label: "ダーク", icon: Moon },
];

export function ThemeSelector() {
  const { preference, setPreference } = useTheme();
  return (
    <div role="radiogroup" aria-label="表示テーマ" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {options.map((o) => {
        const active = preference === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setPreference(o.value)}
            className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition ${active ? "border-brand-400 bg-brand-50 text-accent" : "border-slate-200 bg-surface text-slate-600 hover:border-brand-300"}`}
          >
            <o.icon size={15} />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
