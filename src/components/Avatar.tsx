"use client";

import { useState } from "react";

const COLORS = ["bg-indigo-500", "bg-sky-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-violet-500", "bg-teal-500"];
function colorFor(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

// アイコン画像（https URL）が無い／読み込めない場合は頭文字アバターにフォールバックする
export function Avatar({ name, photoURL, size = 24, seed }: { name: string; photoURL?: string; size?: number; seed?: string }) {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size, fontSize: Math.max(10, size * 0.45) };
  if (photoURL && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photoURL} alt="" style={style} className="shrink-0 rounded-full object-cover" onError={() => setFailed(true)} referrerPolicy="no-referrer" />;
  }
  return (
    <span style={style} className={`inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white ${colorFor(seed || name)}`}>
      {(name || "?").trim().charAt(0).toUpperCase()}
    </span>
  );
}

export function PersonChip({ name, photoURL, size = 20, muted }: { name: string; photoURL?: string; size?: number; muted?: boolean }) {
  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 ${muted ? "text-slate-400" : "text-slate-600"}`}>
      <Avatar name={name} photoURL={photoURL} size={size} />
      <span className="truncate">{name}</span>
    </span>
  );
}
