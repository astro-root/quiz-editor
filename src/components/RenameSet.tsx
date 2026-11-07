"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

const MAX = 60;

// 問題セットの名前を変える。変更できるのは管理者のみ（firestore.rules が最終的に判断する）。
export function RenameSet({ name, editable, onSave }: { name: string; editable: boolean; onSave: (name: string) => Promise<void> }) {
  const [v, setV] = useState(name);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { setV(name); }, [name]);

  const trimmed = v.trim();
  const len = Array.from(trimmed).length;
  const dirty = trimmed !== name;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editable || saving || !dirty) return;
    if (len === 0) return setMsg({ ok: false, text: "名前を入力してください" });
    if (len > MAX) return setMsg({ ok: false, text: `名前は${MAX}文字以内にしてください` });
    setSaving(true);
    setMsg(null);
    try {
      await onSave(trimmed);
      setMsg({ ok: true, text: "名前を変更しました" });
    } catch (err: any) {
      console.error(err);
      setMsg({ ok: false, text: err?.code === "permission-denied" ? "名前を変更できるのは管理者のみです" : "変更に失敗しました" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-5 rounded-2xl border border-slate-100 bg-surface p-5 shadow-card">
      <h2 className="mb-1 text-sm font-medium text-slate-600">問題セットの名前</h2>
      {!editable && <p className="mb-3 text-xs text-slate-400">名前を変更できるのは管理者のみです。</p>}
      <form onSubmit={save} className="mt-2 flex gap-2">
        <input
          value={v}
          onChange={(e) => { setV(e.target.value); setMsg(null); }}
          disabled={!editable}
          maxLength={MAX * 2}
          aria-label="問題セットの名前"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-surface p-2.5 text-base text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:opacity-60"
        />
        {editable && (
          <button type="submit" disabled={saving || !dirty || len === 0} className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}変更
          </button>
        )}
      </form>
      <div className="mt-1 flex items-center justify-between text-xs">
        <span role="status" className={msg ? (msg.ok ? "text-ok" : "text-danger") : "text-transparent"}>{msg?.text ?? "."}</span>
        <span className={`tabular-nums ${len > MAX ? "text-danger" : "text-slate-400"}`}>{len}/{MAX}</span>
      </div>
    </section>
  );
}
