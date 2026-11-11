"use client";

import { useEffect, useState } from "react";

// 別解・タグのような、複数の値を1つの欄で入力する。区切りは「,」「、」「，」と改行。
// 入力中の文字は、そのまま欄に残す（区切りの直後に「,」が消えて、続けて打てない不具合の対策）。
export const parseList = (s: string) => s.split(/[,、，\n]/).map((x) => x.trim()).filter(Boolean);
const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

export function ListInput({ value, onChange, disabled, className, placeholder, ariaLabel }: {
  value: string[]; onChange: (v: string[]) => void; disabled?: boolean; className?: string; placeholder?: string; ariaLabel?: string;
}) {
  const [raw, setRaw] = useState(() => value.join(", "));
  // 外から値が変わったとき（書きかけの復元・クリアなど）だけ、欄の文字を作り直す
  useEffect(() => {
    setRaw((cur) => (sameList(parseList(cur), value) ? cur : value.join(", ")));
  }, [value]);
  return (
    <input
      value={raw}
      disabled={disabled}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => { setRaw(e.target.value); onChange(parseList(e.target.value)); }}
      onBlur={() => setRaw(parseList(raw).join(", "))}
      className={className}
    />
  );
}
