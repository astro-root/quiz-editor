"use client";

import { useState } from "react";
import { DatabaseBackup, Loader2 } from "lucide-react";
import { backupSet, downloadJson, stamp } from "@/lib/backup";
import { QuestionSet } from "@/lib/types";

// 問題セット全体のバックアップ（JSON）。設定・メンバー・すべての問題（ゴミ箱を含む）が入る。
export function SetBackup({ set }: { set: QuestionSet }) {
  const [busy, setBusy] = useState(false);
  const [images, setImages] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function run() {
    setBusy(true); setMsg(null);
    try {
      const data = await backupSet(set.id, set as unknown as Record<string, unknown>, images);
      downloadJson(`qraft-backup-${set.name.replace(/[\\/:*?"<>|\s]+/g, "_").slice(0, 30)}-${stamp()}.json`, data);
      setMsg({ ok: true, text: `${data.questions.length}件の問題を、ダウンロードしました` });
    } catch (e) {
      console.error(e);
      setMsg({ ok: false, text: "ダウンロードできませんでした" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mb-5 rounded-2xl border border-slate-100 bg-surface p-5 shadow-card">
      <h2 className="mb-1 flex items-center gap-1.5 text-sm font-medium text-slate-600"><DatabaseBackup size={15} />バックアップ（JSON）</h2>
      <p className="mb-3 text-xs leading-relaxed text-slate-400">この問題セットの、設定（ジャンル・Round・ノルマなど）、メンバー、すべての問題（ゴミ箱の問題も含む）を、1つのファイルに保存します。ExcelやCSVと違い、設定まで丸ごと残せるので、大切なセットは、定期的に保存してください。</p>
      <label className="mb-3 flex min-h-[36px] items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={images} onChange={(e) => setImages(e.target.checked)} className="h-4 w-4" />添付画像も含める（ファイルが大きくなります）</label>
      <button onClick={run} disabled={busy} className="flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-200 bg-surface px-4 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50">
        {busy ? <Loader2 size={14} className="animate-spin" /> : <DatabaseBackup size={14} />}バックアップを取る
      </button>
      {msg && <p role="status" className={`mt-2 text-xs ${msg.ok ? "text-ok" : "text-danger"}`}>{msg.text}</p>}
    </section>
  );
}
