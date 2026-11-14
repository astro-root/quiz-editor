"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { fetchNotices, getSeen, Notice, setSeen } from "@/lib/notices";

// 運営からのお知らせ。ベルを押すと、一覧が開く。開いたら、既読にする。
export function NoticeBell() {
  const { user } = useAuth();
  const uid = user?.uid;
  const [items, setItems] = useState<Notice[]>([]);
  const [seen, setSeenState] = useState(0);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!uid) return;
    let alive = true;
    setSeenState(getSeen(uid));
    fetchNotices(uid).then((n) => alive && setItems(n)).catch((e) => console.error("お知らせを取得できませんでした", e));
    return () => { alive = false; };
  }, [uid]);

  // 閉じたら、画面上の既読の印を更新する
  useEffect(() => {
    if (!open && uid) setSeenState(getSeen(uid));
  }, [open, uid]);

  // 外側を押す・Esc で閉じる
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  if (!uid) return null;
  const unread = items.filter((n) => n.createdAt > seen).length;

  function toggle() {
    const next = !open;
    setOpen(next);
    // 開いたら、既読として記録する（画面上の「新着」の印は、閉じたときに消える）
    if (next && items.length > 0) setSeen(uid!, Math.max(...items.map((n) => n.createdAt)));
  }

  return (
    <div ref={box} className="relative">
      <button onClick={toggle} aria-label={unread > 0 ? `お知らせ（未読${unread}件）` : "お知らせ"} aria-expanded={open} className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700">
        <Bell size={18} />
        {unread > 0 && <span className="absolute right-0.5 top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-medium text-white">{unread}</span>}
      </button>
      {open && (
        <div role="dialog" aria-label="お知らせ" className="absolute right-0 z-40 mt-2 max-h-[70dvh] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-surface p-3 shadow-lg">
          <p className="mb-2 px-1 text-xs font-medium text-slate-500">お知らせ</p>
          {items.length === 0 ? (
            <p className="px-1 py-6 text-center text-sm text-slate-400">お知らせはありません</p>
          ) : (
            <ul className="space-y-2">
              {items.map((n) => (
                <li key={`${n.scope}:${n.id}`} className="rounded-xl bg-slate-50 p-3">
                  <p className="flex items-start justify-between gap-2 text-sm font-medium text-slate-700">
                    <span>{n.title}</span>
                    {n.createdAt > seen && <span className="mt-0.5 shrink-0 rounded-full bg-rose-100 px-1.5 text-[10px] text-rose-600">新着</span>}
                  </p>
                  {n.body && <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-500">{n.body}</p>}
                  <p className="mt-1.5 text-[11px] text-slate-300">{n.createdAt ? new Date(n.createdAt).toLocaleString("ja-JP") : ""}{n.scope === "me" && "・あなた宛"}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
