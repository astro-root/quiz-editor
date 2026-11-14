"use client";

import { useMemo, useState } from "react";
import { Ban, Bell, ChevronRight, ShieldCheck } from "lucide-react";
import { AdminUser, banUser, unbanUser } from "@/lib/adminData";
import { sendNotice } from "@/lib/notices";
import { QuestionSet } from "@/lib/types";
import { roleLabel } from "@/lib/permissions";

const input = "w-full rounded-lg border border-slate-200 bg-surface p-2.5 text-base text-slate-700 placeholder:text-slate-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";
const smallBtn = "min-h-[36px] rounded-lg border border-slate-200 bg-surface px-3 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40";
export const fmt = (ms: number) => (ms ? new Date(ms).toLocaleString("ja-JP") : "—");

// アカウント一覧。所属する問題セットの確認、通知の送信、停止・解除ができる。
export function AccountsTab({ me, accounts, sets, onChanged, onOpenSet }: {
  me: string; accounts: AdminUser[]; sets: QuestionSet[]; onChanged: () => Promise<void>; onOpenSet: (setId: string) => void;
}) {
  const [q, setQ] = useState("");
  const [only, setOnly] = useState<"all" | "banned">("all");
  const [open, setOpen] = useState<string | null>(null);
  const [panel, setPanel] = useState<{ uid: string; kind: "notice" | "ban" } | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return accounts.filter((a) => (only === "all" || a.banned) && (!t || [a.displayName, a.handle, a.email, a.uid].some((x) => x.toLowerCase().includes(t))));
  }, [accounts, q, only]);

  const setsOf = (uid: string) => sets.filter((s) => s.members[uid]);

  async function run(fn: () => Promise<unknown>, okText: string) {
    setBusy(true); setMsg(null);
    try { await fn(); setMsg({ ok: true, text: okText }); setPanel(null); setTitle(""); setBody(""); setReason(""); await onChanged(); }
    catch (e: any) { console.error(e); setMsg({ ok: false, text: e?.message || "操作に失敗しました" }); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="表示名・ID・メール・uid で絞り込み" aria-label="アカウントを絞り込み" className={`${input} min-w-0 flex-1 sm:max-w-md`} />
        <label className="flex min-h-[40px] items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={only === "banned"} onChange={(e) => setOnly(e.target.checked ? "banned" : "all")} className="h-4 w-4" />停止中のみ</label>
        <span className="text-xs text-slate-400">{list.length} / {accounts.length} 件</span>
      </div>
      {msg && <p role="status" className={`mb-3 rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-ok" : "bg-rose-50 text-danger"}`}>{msg.text}</p>}
      <ul className="space-y-2">
        {list.map((a) => {
          const isOpen = open === a.uid;
          const mine = setsOf(a.uid);
          const self = a.uid === me;
          return (
            <li key={a.uid} className={`rounded-xl border bg-surface p-3 ${a.banned ? "border-rose-200" : "border-slate-100"}`}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <button onClick={() => setOpen(isOpen ? null : a.uid)} aria-expanded={isOpen} className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
                  <ChevronRight size={14} className={`shrink-0 text-slate-300 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                  <span className="truncate font-medium text-slate-700">{a.displayName || "（表示名なし）"}</span>
                  {a.handle && <span className="shrink-0 text-xs text-slate-400">@{a.handle}</span>}
                  {a.banned && <span className="shrink-0 rounded-full bg-rose-100 px-2 text-[11px] text-rose-600">停止中</span>}
                  {self && <span className="shrink-0 rounded-full bg-brand-100 px-2 text-[11px] text-accent">あなた</span>}
                </button>
                <span className="truncate text-xs text-slate-500">{a.email}</span>
                <span className="text-xs text-slate-400">{fmt(a.createdAt)}</span>
              </div>
              {isOpen && (
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <p className="mb-2 break-all text-[11px] text-slate-300">uid: {a.uid}</p>
                  {a.banned && <p className="mb-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-danger">停止の理由：{a.banReason || "（記録なし）"}</p>}
                  <p className="mb-1 text-xs font-medium text-slate-500">参加している問題セット（{mine.length}）</p>
                  {mine.length === 0 ? <p className="mb-3 text-xs text-slate-300">なし</p> : (
                    <ul className="mb-3 space-y-1">
                      {mine.map((s) => (
                        <li key={s.id} className="flex items-center justify-between gap-2 text-sm text-slate-600">
                          <span className="min-w-0 truncate">{s.name}<span className="ml-2 text-xs text-slate-400">{roleLabel[s.members[a.uid]] ?? s.members[a.uid]}{s.ownerId === a.uid && "・オーナー"}</span></span>
                          <button onClick={() => onOpenSet(s.id)} className={smallBtn}>中身を見る</button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => { setPanel(panel?.uid === a.uid && panel.kind === "notice" ? null : { uid: a.uid, kind: "notice" }); setMsg(null); }} className={`${smallBtn} flex items-center gap-1.5`}><Bell size={13} />通知を送る</button>
                    {a.banned ? (
                      <button disabled={busy} onClick={() => confirm(`${a.displayName || a.email} の停止を解除しますか？`) && run(() => unbanUser(a.uid), "停止を解除しました")} className={`${smallBtn} flex items-center gap-1.5`}><ShieldCheck size={13} />停止を解除</button>
                    ) : (
                      <button disabled={self} title={self ? "自分のアカウントは停止できません" : ""} onClick={() => { setPanel(panel?.uid === a.uid && panel.kind === "ban" ? null : { uid: a.uid, kind: "ban" }); setMsg(null); }} className={`${smallBtn} flex items-center gap-1.5 text-danger`}><Ban size={13} />停止する</button>
                    )}
                  </div>
                  {panel?.uid === a.uid && panel.kind === "notice" && (
                    <form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); run(() => sendNotice(a.uid, title, body), "通知を送りました"); }}>
                      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder="件名（60文字まで）" aria-label="件名" className={input} />
                      <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} rows={4} placeholder="本文（1000文字まで）" aria-label="本文" className={`${input} resize-y`} />
                      <button type="submit" disabled={busy || !title.trim()} className="min-h-[40px] rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40">送信</button>
                    </form>
                  )}
                  {panel?.uid === a.uid && panel.kind === "ban" && (
                    <form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); if (confirm(`${a.displayName || a.email} を停止します。停止すると、データの読み書きができなくなります。よろしいですか？`)) run(() => banUser(me, a.uid, reason), "アカウントを停止しました"); }}>
                      <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={3} placeholder="停止の理由（記録用。本人には表示されません）" aria-label="停止の理由" className={`${input} resize-y`} />
                      <button type="submit" disabled={busy} className="min-h-[40px] rounded-lg bg-rose-600 px-4 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-40">停止する</button>
                    </form>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {list.length === 0 && <p className="py-10 text-center text-sm text-slate-400">該当するアカウントがありません</p>}
    </div>
  );
}
