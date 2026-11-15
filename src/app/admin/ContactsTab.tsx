"use client";

import { Dispatch, SetStateAction, useMemo, useState } from "react";
import { Mail, Trash2 } from "lucide-react";
import { AdminContact, contactCategoryLabel, deleteContact, setContactStatus } from "@/lib/adminData";
import { useConfirm } from "@/components/Confirm";
import { fmt } from "./AccountsTab";

// お問い合わせフォームに届いた内容。状態（未対応／対応済み）の切り替え、メールでの返信、削除ができる。
export function ContactsTab({ items, setItems, error, nameOf, onReload }: {
  items: AdminContact[] | null; setItems: Dispatch<SetStateAction<AdminContact[] | null>>; error: string;
  nameOf: (uid: string) => string; onReload: () => Promise<void>;
}) {
  const [onlyNew, setOnlyNew] = useState(true);
  const [cat, setCat] = useState("");
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [ask, dialog] = useConfirm();

  const list = useMemo(() => {
    const t = text.trim().toLowerCase();
    return (items ?? []).filter((c) => (!onlyNew || c.status === "new") && (!cat || c.category === cat) && (!t || [c.message, c.name, c.email].some((s) => s.toLowerCase().includes(t))));
  }, [items, onlyNew, cat, text]);
  const newCount = (items ?? []).filter((c) => c.status === "new").length;

  async function toggle(c: AdminContact) {
    const next = c.status === "new" ? "done" : "new";
    setItems((xs) => xs && xs.map((x) => (x.id === c.id ? { ...x, status: next } : x)));
    try { await setContactStatus(c.id, next); setErr(""); } catch (e) { console.error(e); setErr("状態を変更できませんでした"); onReload(); }
  }
  async function remove(c: AdminContact) {
    if (!(await ask({ title: "このお問い合わせを削除しますか？", body: "元に戻せません。", confirmLabel: "削除する", danger: true }))) return;
    try { await deleteContact(c.id); setItems((xs) => xs && xs.filter((x) => x.id !== c.id)); setErr(""); } catch (e) { console.error(e); setErr("削除できませんでした"); }
  }
  const reply = (c: AdminContact) => `mailto:${c.email}?subject=${encodeURIComponent("【Qraft】お問い合わせへのご返信")}`;

  if (!items && !error) return <p className="py-6 text-sm text-slate-400">読み込み中…</p>;
  return (
    <div>
      {dialog}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="内容・お名前・メールで絞り込み" aria-label="お問い合わせを絞り込み" className="min-h-[44px] w-full min-w-0 flex-1 rounded-lg border border-slate-200 bg-surface px-3 text-base focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 sm:max-w-md sm:flex-none sm:basis-96" />
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="種別" className="min-h-[44px] rounded-lg border border-slate-200 bg-surface px-2 text-sm text-slate-600">
          <option value="">すべての種別</option>
          {Object.entries(contactCategoryLabel).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
        </select>
        <label className="flex min-h-[44px] items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={onlyNew} onChange={(e) => setOnlyNew(e.target.checked)} className="h-4 w-4" />未対応のみ</label>
        <span className="text-xs text-slate-400">未対応 {newCount}件 / 全 {items?.length ?? 0}件</span>
      </div>
      {(error || err) && <p role="alert" className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-danger">{error || err}</p>}
      <ul className="grid gap-2 xl:grid-cols-2">
        {list.map((c) => (
          <li key={c.id} className={`rounded-xl border bg-surface p-3 ${c.status === "new" ? "border-brand-200" : "border-slate-100 opacity-80"}`}>
            <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
              <span className={`rounded-full px-2 py-0.5 ${c.status === "new" ? "bg-brand-100 text-accent" : "bg-slate-100 text-slate-500"}`}>{c.status === "new" ? "未対応" : "対応済み"}</span>
              <span>{contactCategoryLabel[c.category] ?? c.category}</span>
              <span>{fmt(c.createdAt)}</span>
              {c.name && <span className="text-slate-600">{c.name}</span>}
              {c.uid && <span title={c.uid}>ログイン済み：{nameOf(c.uid)}</span>}
              {c.email && <span className="break-all text-slate-500">{c.email}</span>}
            </div>
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">{c.message}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={() => toggle(c)} className="min-h-[40px] rounded-lg border border-slate-200 bg-surface px-3 text-xs text-slate-600 hover:bg-slate-50">{c.status === "new" ? "対応済みにする" : "未対応に戻す"}</button>
              {c.email && <a href={reply(c)} className="flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 bg-surface px-3 text-xs text-accent hover:bg-brand-50"><Mail size={13} />メールで返信</a>}
              <button onClick={() => remove(c)} aria-label="削除" className="ml-auto flex min-h-[40px] items-center rounded-lg border border-slate-200 bg-surface px-3 text-slate-400 hover:text-danger"><Trash2 size={14} /></button>
            </div>
          </li>
        ))}
      </ul>
      {list.length === 0 && !error && <p className="py-10 text-center text-sm text-slate-400">{onlyNew ? "未対応のお問い合わせはありません" : "該当するお問い合わせはありません"}</p>}
    </div>
  );
}
