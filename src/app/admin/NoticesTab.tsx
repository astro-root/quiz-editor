"use client";

import { useCallback, useEffect, useState } from "react";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { Trash2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { toMillis } from "@/lib/time";
import { deleteBroadcast, sendNotice } from "@/lib/notices";
import { searchUsers } from "@/lib/useInvites";
import { PublicProfile } from "@/lib/types";
import { useConfirm } from "@/components/Confirm";
import { fmt } from "./AccountsTab";

interface Sent { id: string; title: string; body: string; createdAt: number }
const input = "w-full rounded-lg border border-slate-200 bg-surface p-2.5 text-base text-slate-700 placeholder:text-slate-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";

// お知らせを送る。全員向けと、ユーザーIDを指定した個人向けがある（個人向けは、アカウントの詳細からも送れる）。
export function NoticesTab() {
  const [mode, setMode] = useState<"all" | "user">("all");
  const [handle, setHandle] = useState("");
  const [target, setTarget] = useState<PublicProfile | null | undefined>(undefined); // undefined=未検索、null=見つからない
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [sent, setSent] = useState<Sent[]>([]);
  const [ask, dialog] = useConfirm();

  const reload = useCallback(async () => {
    try {
      const snap = await getDocs(query(collection(db, "broadcasts"), orderBy("createdAt", "desc"), limit(30)));
      setSent(snap.docs.map((d) => ({ id: d.id, title: d.data().title ?? "", body: d.data().body ?? "", createdAt: toMillis(d.data().createdAt) })));
    } catch (e) { console.error(e); }
  }, []);
  useEffect(() => { reload(); }, [reload]);

  // ユーザーIDの入力が止まったら、相手を探す
  useEffect(() => {
    setTarget(undefined);
    if (mode !== "user" || !handle.trim()) return;
    let alive = true;
    const t = setTimeout(() => { searchUsers(handle).then((r) => alive && setTarget(r[0] ?? null)).catch(() => alive && setTarget(null)); }, 400);
    return () => { alive = false; clearTimeout(t); };
  }, [mode, handle]);

  const ready = !!title.trim() && (mode === "all" || !!target);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !ready) return;
    const ok = await ask(mode === "all"
      ? { title: "全員にお知らせを送りますか？", body: "送ったお知らせは、利用者のベルに出ます。あとから、削除はできます。", confirmLabel: "全員に送る" }
      : { title: `${target?.displayName} さんに通知を送りますか？`, confirmLabel: "送る" });
    if (!ok) return;
    setBusy(true); setMsg(null);
    try {
      await sendNotice(mode === "all" ? "all" : target!.uid, title, body);
      setTitle(""); setBody("");
      setMsg({ ok: true, text: mode === "all" ? "全員に送りました" : "送りました" });
      if (mode === "all") await reload();
    } catch (err: any) { console.error(err); setMsg({ ok: false, text: err?.message || "送信できませんでした" }); }
    finally { setBusy(false); }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {dialog}
      <form onSubmit={submit} className="space-y-3">
        <div role="radiogroup" aria-label="送り先" className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {([["all", "全員"], ["user", "ユーザーIDで指定"]] as const).map(([v, t]) => (
            <button key={v} type="button" role="radio" aria-checked={mode === v} onClick={() => setMode(v)} className={`min-h-[40px] flex-1 rounded-lg text-sm font-medium ${mode === v ? "bg-surface text-accent shadow-sm" : "text-slate-500"}`}>{t}</button>
          ))}
        </div>
        {mode === "user" && (
          <div>
            <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="ユーザーID（完全一致。@は付けても付けなくても可）" aria-label="ユーザーID" autoCapitalize="none" spellCheck={false} className={input} />
            <p className={`mt-1 min-h-[1.25rem] text-xs ${target ? "text-ok" : target === null ? "text-danger" : "text-slate-400"}`} role="status">
              {target ? `送り先：${target.displayName}（@${target.handle}）` : target === null ? "該当するユーザーが見つかりません" : handle.trim() ? "探しています…" : ""}
            </p>
          </div>
        )}
        <div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder="件名" aria-label="件名" className={input} />
          <p className="mt-1 text-right text-xs tabular-nums text-slate-400">{title.length}/60</p>
        </div>
        <div>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} rows={7} placeholder="本文" aria-label="本文" className={`${input} resize-y leading-relaxed`} />
          <p className="mt-1 text-right text-xs tabular-nums text-slate-400">{body.length}/1000</p>
        </div>
        {msg && <p role="status" className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-ok" : "bg-rose-50 text-danger"}`}>{msg.text}</p>}
        <button type="submit" disabled={busy || !ready} className="min-h-[48px] w-full rounded-lg bg-brand-600 px-5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40 sm:w-auto">{mode === "all" ? "全員に送る" : "送る"}</button>
        <p className="text-xs text-slate-400">利用者は、ダッシュボードのベルで見られます。メールでは届きません。</p>
      </form>
      <div>
        <h2 className="mb-2 text-sm font-medium text-slate-600">送った全員向けのお知らせ（新しい順）</h2>
        {sent.length === 0 ? <p className="text-sm text-slate-300">まだありません</p> : (
          <ul className="space-y-2">
            {sent.map((n) => (
              <li key={n.id} className="rounded-xl border border-slate-100 bg-surface p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-700">{n.title}</p>
                  <button onClick={async () => { if (await ask({ title: "このお知らせを削除しますか？", body: "利用者の画面からも消えます。", confirmLabel: "削除する", danger: true })) { await deleteBroadcast(n.id).catch((e) => console.error(e)); reload(); } }} aria-label="削除" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-300 hover:bg-slate-50 hover:text-danger"><Trash2 size={14} /></button>
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
