"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Mail, Trash2 } from "lucide-react";
import { AdminContact, contactCategoryLabel, deleteContact, loadContacts, setContactStatus } from "@/lib/adminData";
import { fmt } from "./AccountsTab";

// お問い合わせフォームに届いた内容。状態（新規／対応済み）の切り替えと、削除ができる。
export function ContactsTab({ nameOf }: { nameOf: (uid: string) => string }) {
  const [items, setItems] = useState<AdminContact[] | null>(null);
  const [error, setError] = useState("");
  const [onlyNew, setOnlyNew] = useState(true);

  const reload = useCallback(async () => {
    setError("");
    try { setItems(await loadContacts()); } catch (e) { console.error(e); setError("お問い合わせを読み込めませんでした"); }
  }, []);
  useEffect(() => { reload(); }, [reload]);

  async function toggle(c: AdminContact) {
    const next = c.status === "new" ? "done" : "new";
    setItems((xs) => xs && xs.map((x) => (x.id === c.id ? { ...x, status: next } : x)));
    try { await setContactStatus(c.id, next); } catch (e) { console.error(e); setError("状態を変更できませんでした"); reload(); }
  }
  async function remove(c: AdminContact) {
    if (!confirm("このお問い合わせを削除しますか？（元に戻せません）")) return;
    try { await deleteContact(c.id); setItems((xs) => xs && xs.filter((x) => x.id !== c.id)); } catch (e) { console.error(e); setError("削除できませんでした"); }
  }

  if (!items && !error) return <p className="flex items-center gap-2 py-6 text-sm text-slate-400"><Loader2 size={14} className="animate-spin" />読み込み中</p>;
  const list = (items ?? []).filter((c) => !onlyNew || c.status === "new");
  const newCount = (items ?? []).filter((c) => c.status === "new").length;
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="flex min-h-[40px] items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={onlyNew} onChange={(e) => setOnlyNew(e.target.checked)} className="h-4 w-4" />未対応のみ</label>
        <span className="text-xs text-slate-400">未対応 {newCount}件 / 全 {items?.length ?? 0}件（新しい順、最大200件）</span>
      </div>
      {error && <p role="alert" className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-danger">{error}</p>}
      <ul className="space-y-2">
        {list.map((c) => (
          <li key={c.id} className={`rounded-xl border bg-surface p-3 ${c.status === "new" ? "border-brand-200" : "border-slate-100 opacity-80"}`}>
            <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
              <span className={`rounded-full px-2 py-0.5 ${c.status === "new" ? "bg-brand-100 text-accent" : "bg-slate-100 text-slate-500"}`}>{c.status === "new" ? "未対応" : "対応済み"}</span>
              <span>{contactCategoryLabel[c.category] ?? c.category}</span>
              <span>{fmt(c.createdAt)}</span>
              {c.name && <span className="text-slate-600">{c.name}</span>}
              {c.uid && <span title={c.uid}>ログイン済み：{nameOf(c.uid)}</span>}
              {c.email && <a href={`mailto:${c.email}`} className="flex items-center gap-1 text-accent underline"><Mail size={12} />{c.email}</a>}
            </div>
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">{c.message}</p>
            <div className="mt-2 flex gap-2">
              <button onClick={() => toggle(c)} className="min-h-[36px] rounded-lg border border-slate-200 bg-surface px-3 text-xs text-slate-600 hover:bg-slate-50">{c.status === "new" ? "対応済みにする" : "未対応に戻す"}</button>
              <button onClick={() => remove(c)} aria-label="削除" className="flex min-h-[36px] items-center rounded-lg border border-slate-200 bg-surface px-2.5 text-slate-400 hover:text-danger"><Trash2 size={14} /></button>
            </div>
          </li>
        ))}
      </ul>
      {list.length === 0 && !error && <p className="py-10 text-center text-sm text-slate-400">{onlyNew ? "未対応のお問い合わせはありません" : "お問い合わせはありません"}</p>}
    </div>
  );
}
