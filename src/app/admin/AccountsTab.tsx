"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Ban, Bell, Check, ChevronRight, Copy as CopyIcon, ShieldCheck } from "lucide-react";
import { AdminUser, banUser, unbanUser } from "@/lib/adminData";
import { sendNotice } from "@/lib/notices";
import { QuestionSet } from "@/lib/types";
import { roleLabel } from "@/lib/permissions";
import { useConfirm } from "@/components/Confirm";

const input = "w-full rounded-lg border border-slate-200 bg-surface p-2.5 text-base text-slate-700 placeholder:text-slate-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";
const smallBtn = "flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 bg-surface px-3 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40";
export const fmt = (ms: number) => (ms ? new Date(ms).toLocaleString("ja-JP") : "—");
const PAGE = 100;

type Filter = "all" | "banned" | "noset";
type Sort = "new" | "old" | "name";

// アカウント。左に一覧、右に選んだ人の詳細（PC）。スマホでは、一覧から選ぶと詳細に切り替わる。
export function AccountsTab({ me, accounts, sets, focusUid, onFocusDone, onChanged, onOpenSet }: {
  me: string; accounts: AdminUser[]; sets: QuestionSet[]; focusUid: string | null; onFocusDone: () => void;
  onChanged: () => Promise<void>; onOpenSet: (setId: string) => void;
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("new");
  const [shown, setShown] = useState(PAGE);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (focusUid) { setSelected(focusUid); onFocusDone(); }
  }, [focusUid, onFocusDone]);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase().replace(/^@/, "");
    const hasSet = (uid: string) => sets.some((s) => s.members[uid]);
    const out = accounts.filter((a) =>
      (filter === "all" || (filter === "banned" ? a.banned : !hasSet(a.uid))) &&
      (!t || [a.displayName, a.handle, a.email, a.uid].some((x) => x.toLowerCase().includes(t))));
    if (sort === "old") out.sort((a, b) => a.createdAt - b.createdAt);
    else if (sort === "name") out.sort((a, b) => (a.displayName || "").localeCompare(b.displayName || "", "ja"));
    return out;
  }, [accounts, sets, q, filter, sort]);

  const sel = accounts.find((a) => a.uid === selected) ?? null;

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:items-start lg:gap-6 xl:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]">
      <div className={sel ? "hidden lg:block" : ""}>
        <input value={q} onChange={(e) => { setQ(e.target.value); setShown(PAGE); }} placeholder="表示名・ID・メール・uid で絞り込み" aria-label="アカウントを絞り込み" className={`${input} mb-2`} />
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <select value={filter} onChange={(e) => { setFilter(e.target.value as Filter); setShown(PAGE); }} aria-label="表示する条件" className="min-h-[40px] rounded-lg border border-slate-200 bg-surface px-2 text-sm text-slate-600">
            <option value="all">すべて</option><option value="banned">停止中のみ</option><option value="noset">どのセットにも未参加</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="並び順" className="min-h-[40px] rounded-lg border border-slate-200 bg-surface px-2 text-sm text-slate-600">
            <option value="new">登録が新しい順</option><option value="old">登録が古い順</option><option value="name">表示名順</option>
          </select>
          <span className="ml-auto text-xs text-slate-400">{list.length} / {accounts.length} 件</span>
        </div>
        <ul className="space-y-1.5">
          {list.slice(0, shown).map((a) => (
            <li key={a.uid}>
              <button onClick={() => setSelected(a.uid)} aria-current={selected === a.uid} className={`flex w-full items-center gap-2 rounded-xl border p-3 text-left transition ${selected === a.uid ? "border-brand-300 bg-brand-50" : a.banned ? "border-rose-200 bg-surface" : "border-slate-100 bg-surface hover:border-brand-200"}`}>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium text-slate-700">{a.displayName || "（表示名なし）"}</span>
                    {a.handle && <span className="shrink-0 text-xs text-slate-400">@{a.handle}</span>}
                    {a.banned && <span className="shrink-0 rounded-full bg-rose-100 px-2 text-[11px] text-rose-600">停止中</span>}
                    {a.uid === me && <span className="shrink-0 rounded-full bg-brand-100 px-2 text-[11px] text-accent">あなた</span>}
                  </span>
                  <span className="block truncate text-xs text-slate-400">{a.email}</span>
                </span>
                <ChevronRight size={16} className="shrink-0 text-slate-300" />
              </button>
            </li>
          ))}
        </ul>
        {list.length === 0 && <p className="py-10 text-center text-sm text-slate-400">該当するアカウントがありません</p>}
        {list.length > shown && <button onClick={() => setShown((n) => n + PAGE)} className="mt-3 min-h-[44px] w-full rounded-lg border border-slate-200 bg-surface text-sm text-slate-600 hover:bg-slate-50">さらに表示（残り {list.length - shown} 件）</button>}
      </div>

      <div className={`${sel ? "" : "hidden lg:block"} lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto lg:overscroll-contain`}>
        {sel ? (
          <AccountDetail key={sel.uid} a={sel} me={me} sets={sets} onBack={() => setSelected(null)} onChanged={onChanged} onOpenSet={onOpenSet} />
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-300">左の一覧から、アカウントを選んでください</p>
        )}
      </div>
    </div>
  );
}

function CopyBtn({ text, label }: { text: string; label: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={async () => { try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500); } catch { /* noop */ } }}
      aria-label={`${label}をコピー`}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-300 hover:bg-slate-100 hover:text-slate-600"
    >
      {ok ? <Check size={14} className="text-ok" /> : <CopyIcon size={14} />}
    </button>
  );
}

function AccountDetail({ a, me, sets, onBack, onChanged, onOpenSet }: {
  a: AdminUser; me: string; sets: QuestionSet[]; onBack: () => void; onChanged: () => Promise<void>; onOpenSet: (id: string) => void;
}) {
  const [ask, dialog] = useConfirm();
  const [panel, setPanel] = useState<"notice" | "ban" | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const self = a.uid === me;
  const mine = sets.filter((s) => s.members[a.uid]);
  const name = a.displayName || a.email;

  async function run(fn: () => Promise<unknown>, okText: string) {
    setBusy(true); setMsg(null);
    try { await fn(); setMsg({ ok: true, text: okText }); setPanel(null); setTitle(""); setBody(""); setReason(""); await onChanged(); }
    catch (e: any) { console.error(e); setMsg({ ok: false, text: e?.message || "操作に失敗しました" }); }
    finally { setBusy(false); }
  }

  const row = (k: string, v: string, copy?: boolean) => (
    <div className="flex items-center gap-2 border-b border-slate-50 py-1.5 text-sm last:border-0">
      <dt className="w-20 shrink-0 text-xs text-slate-400">{k}</dt>
      <dd className="min-w-0 flex-1 break-all text-slate-600">{v || "—"}</dd>
      {copy && v && <CopyBtn text={v} label={k} />}
    </div>
  );

  return (
    <div className="rounded-2xl border border-slate-100 bg-surface p-4 shadow-card sm:p-5">
      {dialog}
      <button onClick={onBack} className="mb-3 flex min-h-[36px] items-center gap-1 text-xs text-slate-400 hover:text-slate-600 lg:hidden"><ArrowLeft size={12} />一覧へ戻る</button>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-slate-800">{a.displayName || "（表示名なし）"}</h2>
        {a.handle && <span className="text-sm text-slate-400">@{a.handle}</span>}
        {a.banned && <span className="rounded-full bg-rose-100 px-2 text-xs text-rose-600">停止中</span>}
        {self && <span className="rounded-full bg-brand-100 px-2 text-xs text-accent">あなた</span>}
      </div>
      {a.banned && <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-danger">停止の理由：{a.banReason || "（記録なし）"}</p>}
      {msg && <p role="status" className={`mb-3 rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-ok" : "bg-rose-50 text-danger"}`}>{msg.text}</p>}

      <dl className="mb-4">
        {row("メール", a.email, true)}
        {row("ユーザーID", a.handle ? `@${a.handle}` : "", !!a.handle)}
        {row("登録日", fmt(a.createdAt))}
        {row("uid", a.uid, true)}
      </dl>

      <h3 className="mb-1.5 text-xs font-medium text-slate-500">参加している問題セット（{mine.length}）</h3>
      {mine.length === 0 ? <p className="mb-4 text-xs text-slate-300">なし</p> : (
        <ul className="mb-4 space-y-1">
          {mine.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-sm text-slate-600">
              <span className="min-w-0 truncate">{s.name}<span className="ml-2 text-xs text-slate-400">{roleLabel[s.members[a.uid]] ?? s.members[a.uid]}{s.ownerId === a.uid && "・オーナー"}</span></span>
              <button onClick={() => onOpenSet(s.id)} className="shrink-0 rounded-md px-2 py-1 text-xs text-accent hover:bg-brand-50">中身を見る</button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <button onClick={() => { setPanel(panel === "notice" ? null : "notice"); setMsg(null); }} className={smallBtn}><Bell size={14} />通知を送る</button>
        {a.banned ? (
          <button disabled={busy} onClick={async () => { if (await ask({ title: "停止を解除しますか？", body: `${name} が、もう一度、利用できるようになります。`, confirmLabel: "解除する" })) run(() => unbanUser(a.uid), "停止を解除しました"); }} className={smallBtn}><ShieldCheck size={14} />停止を解除</button>
        ) : (
          <button disabled={self} title={self ? "自分のアカウントは停止できません" : ""} onClick={() => { setPanel(panel === "ban" ? null : "ban"); setMsg(null); }} className={`${smallBtn} text-danger`}><Ban size={14} />停止する</button>
        )}
      </div>

      {panel === "notice" && (
        <form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); run(() => sendNotice(a.uid, title, body), "通知を送りました"); }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder="件名（60文字まで）" aria-label="件名" className={input} />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} rows={5} placeholder="本文（1000文字まで）" aria-label="本文" className={`${input} resize-y`} />
          <button type="submit" disabled={busy || !title.trim()} className="min-h-[44px] rounded-lg bg-brand-600 px-5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40">送信</button>
        </form>
      )}
      {panel === "ban" && (
        <form className="mt-3 space-y-2" onSubmit={async (e) => { e.preventDefault(); if (await ask({ title: "このアカウントを停止しますか？", body: <>{name} は、データの読み書きができなくなります。理由は、あなただけが見られる記録として残ります。いつでも、解除できます。</>, confirmLabel: "停止する", danger: true })) run(() => banUser(me, a.uid, reason), "アカウントを停止しました"); }}>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={3} placeholder="停止の理由（記録用。本人には表示されません）" aria-label="停止の理由" className={`${input} resize-y`} />
          <button type="submit" disabled={busy} className="min-h-[44px] rounded-lg bg-rose-600 px-5 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-40">停止する</button>
        </form>
      )}
    </div>
  );
}
