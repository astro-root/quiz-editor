"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Markdown } from "./Markdown";
import { fetchNotices, getReadState, isUnread, markAllRead, markRead, Notice, noticeKey } from "@/lib/notices";

// 運営からのお知らせ。ベルを押すと、一覧が開く。開いただけでは、既読にならない。
// 「既読にする」（1件ずつ）と「すべて既読にする」で、既読にする。
export function NoticeBell() {
  const { user } = useAuth();
  const uid = user?.uid;
  const [items, setItems] = useState<Notice[]>([]);
  const [st, setSt] = useState({ before: 0, ids: [] as string[] });
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!uid) return;
    let alive = true;
    setSt(getReadState(uid));
    fetchNotices(uid).then((n) => alive && setItems(n)).catch((e) => console.error("お知らせを取得できませんでした", e));
    return () => { alive = false; };
  }, [uid]);

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
  const unread = items.filter((n) => isUnread(n, st)).length;

  return (
    <div ref={box} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-label={unread > 0 ? `お知らせ（未読${unread}件）` : "お知らせ"} aria-expanded={open} className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700">
        <Bell size={18} />
        {unread > 0 && <span className="absolute right-0.5 top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-medium text-white">{unread}</span>}
      </button>
      {open && (
        <div role="dialog" aria-label="お知らせ" className="absolute right-0 z-40 mt-2 max-h-[70dvh] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-surface p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between gap-2 px-1">
            <p className="text-xs font-medium text-slate-500">お知らせ{unread > 0 && `（未読 ${unread}件）`}</p>
            <button onClick={() => setSt(markAllRead(uid, items))} disabled={unread === 0} className="flex min-h-[32px] items-center gap-1 rounded-md px-2 text-xs text-accent hover:bg-brand-50 disabled:text-slate-300 disabled:hover:bg-transparent"><CheckCheck size={13} />すべて既読にする</button>
          </div>
          {items.length === 0 ? (
            <p className="px-1 py-6 text-center text-sm text-slate-400">お知らせはありません</p>
          ) : (
            <ul className="space-y-2">
              {items.map((n) => {
                const un = isUnread(n, st);
                return (
                  <li key={noticeKey(n)} className={`rounded-xl p-3 ${un ? "bg-brand-50 ring-1 ring-brand-100" : "bg-slate-50 opacity-70"}`}>
                    <p className="flex items-start justify-between gap-2 text-sm font-medium text-slate-700">
                      <span>{n.title}</span>
                      {un && <span className="mt-0.5 shrink-0 rounded-full bg-rose-100 px-1.5 text-[10px] text-rose-600">未読</span>}
                    </p>
                    {n.body && <Markdown text={n.body} className="mt-1 text-xs leading-relaxed text-slate-500 [&>*:last-child]:mb-0" />}
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <p className="text-[11px] text-slate-300">{n.createdAt ? new Date(n.createdAt).toLocaleString("ja-JP") : ""}{n.scope === "me" && "・あなた宛"}</p>
                      {un && <button onClick={() => setSt(markRead(uid, n))} className="flex min-h-[32px] items-center gap-1 rounded-md px-2 text-xs text-accent hover:bg-brand-100"><Check size={13} />既読にする</button>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
