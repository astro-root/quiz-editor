"use client";

import { useState } from "react";
import { DatabaseBackup, Loader2 } from "lucide-react";
import { AdminUser, loadQuestions } from "@/lib/adminData";
import { downloadJson, plain, stamp } from "@/lib/backup";
import { QuestionSet } from "@/lib/types";
import { useConfirm } from "@/components/Confirm";

// 運営者用の、全データのバックアップ。アカウント一覧と、すべての問題セット・問題（画像は含まない）。
export function BackupSection({ accounts, sets }: { accounts: AdminUser[]; sets: QuestionSet[] }) {
  const [ask, dialog] = useConfirm();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function run() {
    if (!(await ask({ title: "全データのバックアップを取りますか？", body: "すべての問題セットの、すべての問題を読み込みます。問題の件数ぶんの読み取りが発生するので（無料枠の1日あたりの上限に、影響することがあります）、必要なときだけ、行ってください。ファイルには、メールアドレスを含む個人情報が入ります。保管に注意してください。", confirmLabel: "取る" }))) return;
    setBusy(true); setMsg(null);
    try {
      const out = [];
      for (let i = 0; i < sets.length; i++) {
        setProgress(`問題を読み込んでいます（${i + 1}/${sets.length}）`);
        const qs = await loadQuestions(sets[i].id);
        out.push({ set: plain(sets[i]), questions: qs.map((q) => plain(q)) });
      }
      downloadJson(`qraft-full-backup-${stamp()}.json`, {
        kind: "qraft-full-backup", version: 1, exportedAt: new Date().toISOString(), includesImages: false,
        accounts: accounts.map((a) => ({ uid: a.uid, email: a.email, displayName: a.displayName, handle: a.handle, createdAt: new Date(a.createdAt).toISOString(), banned: a.banned, banReason: a.banReason })),
        sets: out,
      });
      setMsg({ ok: true, text: `${sets.length}件の問題セットと、${accounts.length}件のアカウントを、ダウンロードしました` });
    } catch (e) {
      console.error(e);
      setMsg({ ok: false, text: "バックアップを取れませんでした" });
    } finally {
      setBusy(false); setProgress("");
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-slate-100 bg-surface p-5 shadow-card">
      {dialog}
      <h2 className="mb-1 flex items-center gap-1.5 text-sm font-medium text-slate-600"><DatabaseBackup size={15} />全データのバックアップ</h2>
      <p className="mb-3 text-xs leading-relaxed text-slate-400">アカウント一覧と、すべての問題セット・問題を、1つのJSONファイルに保存します（添付画像は含みません）。画像も含めたい問題セットは、各セットの「入出力」から、個別に取れます。</p>
      <button onClick={run} disabled={busy} className="flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-200 bg-surface px-4 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50">
        {busy ? <Loader2 size={14} className="animate-spin" /> : <DatabaseBackup size={14} />}{busy ? progress || "取っています" : "バックアップを取る"}
      </button>
      {msg && <p role="status" className={`mt-2 text-xs ${msg.ok ? "text-ok" : "text-danger"}`}>{msg.text}</p>}
    </section>
  );
}
