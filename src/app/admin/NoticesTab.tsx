"use client";

import { useCallback, useEffect, useState } from "react";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { Trash2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { toMillis } from "@/lib/time";
import { deleteBroadcast, sendNotice } from "@/lib/notices";
import { fmt } from "./AccountsTab";

interface Sent { id: string; title: string; body: string; createdAt: number }
const input = "w-full rounded-lg border border-slate-200 bg-surface p-2.5 text-base text-slate-700 placeholder:text-slate-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";

// 全員向けのお知らせを送る。特定の人への通知は、「アカウント」から送る。
export function NoticesTab() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [sent, setSent] = useState<Sent[]>([]);

  const reload = useCallback(async () => {
    try {
      const snap = await getDocs(query(collection(db, "broadcasts"), orderBy("createdAt", "desc"), limit(30)));
      setSent(snap.docs.map((d) => ({ id: d.id, title: d.data().title ?? "", body: d.data().body ?? "", createdAt: toMillis(d.data().createdAt) })));
    } catch (e) { console.error(e); }
  }, []);
  useEffect(() => { reload(); }, [reload]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !title.trim()) return;
    if (!confirm("全員にお知らせを送ります。よろしいですか？")) return;
    setBusy(true); setMsg(null);
    try { await sendNotice("all", title, body); setTitle(""); setBody(""); setMsg({ ok: true, text: "全員に送りました" }); await reload(); }
    catch (err: any) { console.error(err); setMsg({ ok: false, text: err?.message || "送信できませんでした" }); }
    finally { setBusy(false); }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={submit} className="space-y-2">
        <h2 className="text-sm font-medium text-slate-600">全員へのお知らせ</h2>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder="件名（60文字まで）" aria-label="件名" className={input} />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} rows={6} placeholder="本文（1000文字まで）" aria-label="本文" className={`${input} resize-y`} />
        {msg && <p role="status" className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-ok" : "bg-rose-50 text-danger"}`}>{msg.text}</p>}
        <button type="submit" disabled={busy || !title.trim()} className="min-h-[44px] rounded-lg bg-brand-600 px-5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40">全員に送る</button>
        <p className="text-xs text-slate-400">利用者は、ダッシュボードのベルで見られます。メールでは届きません。</p>
      </form>
      <div>
        <h2 className="mb-2 text-sm font-medium text-slate-600">送ったお知らせ（新しい順）</h2>
        {sent.length === 0 ? <p className="text-sm text-slate-300">まだありません</p> : (
          <ul className="space-y-2">
            {sent.map((n) => (
              <li key={n.id} className="rounded-xl border border-slate-100 bg-surface p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-700">{n.title}</p>
                  <button onClick={async () => { if (confirm("このお知らせを削除しますか？（利用者の画面からも消えます）")) { await deleteBroadcast(n.id).catch((e) => console.error(e)); reload(); } }} aria-label="削除" className="shrink-0 text-slate-300 hover:text-danger"><Trash2 size={14} /></button>
                </div>
                {n.body && <p className="mt-1 whitespace-pre-wrap break-words text-xs text-slate-500">{n.body}</p>}
                <p className="mt-1 text-[11px] text-slate-300">{fmt(n.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
