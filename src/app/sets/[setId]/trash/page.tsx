"use client";

import { useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useQuestionStore } from "@/lib/QuestionsContext";
import { useSetContext } from "@/lib/SetContext";
import { canEditQuestion, canPurge } from "@/lib/permissions";
import { PersonChip } from "@/components/Avatar";

export default function TrashPage() {
  const { user } = useAuth();
  const { role, personOf } = useSetContext();
  const { trash, emptyLegacy, restore, hardDelete } = useQuestionStore();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const purge = canPurge(role);
  const canClearEmpty = emptyLegacy.every((q) => canEditQuestion(role, q, user?.uid));

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setErr("");
    try { await fn(); } catch (e: any) {
      console.error(e);
      setErr(e?.code === "permission-denied" ? "この操作の権限がありません" : "操作に失敗しました");
    } finally { setBusy(false); }
  }

  return (
    <div>
      {err && <p role="alert" className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-danger">{err}</p>}

      {emptyLegacy.length > 0 && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
          <p className="mb-1 font-medium text-warn-strong">問題文も解答も空の問題が {emptyLegacy.length} 件あります</p>
          <p className="mb-3 text-xs text-warn-strong">過去の不具合で自動作成された空カードです。一覧・検索・出題順には表示されません。</p>
          {canClearEmpty ? (
            <button disabled={busy} onClick={() => run(() => hardDelete(emptyLegacy.map((q) => q.id)))} className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50">
              空の問題をすべて削除
            </button>
          ) : (
            <p className="text-xs text-warn-strong">削除できるのは管理者・問題統括です。</p>
          )}
        </div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-slate-500">ゴミ箱 {trash.length}件</p>
        {purge && trash.length > 0 && (
          <button disabled={busy} onClick={() => confirm(`ゴミ箱の${trash.length}件を完全に削除します。元に戻せません。`) && run(() => hardDelete(trash.map((q) => q.id)))} className="flex items-center gap-1 text-xs text-danger hover:underline disabled:opacity-50">
            <Trash2 size={12} />ゴミ箱を空にする
          </button>
        )}
      </div>

      {trash.length === 0 && <p className="rounded-xl border border-dashed border-slate-200 bg-surface p-8 text-center text-sm text-slate-400">ゴミ箱は空です</p>}
      <div className="space-y-2">
        {trash.map((q) => {
          const a = personOf(q.authorUid, q.authorName);
          const d = personOf(q.deletedBy);
          const can = canEditQuestion(role, q, user?.uid);
          return (
            <div key={q.id} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-surface p-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 break-words text-slate-600">{q.body || "（問題文なし）"}</p>
                <p className="truncate text-accent">{q.answer}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-slate-400">
                  <PersonChip name={a.name} photoURL={a.photoURL} size={16} muted />
                  <span>{q.deletedAt && q.deletedAt > 1 ? new Date(q.deletedAt).toLocaleString("ja-JP") : ""} {q.deletedBy ? `${d.name}が` : ""}削除</span>
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                {can && <button disabled={busy} onClick={() => run(() => restore(q.id))} className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:border-brand-300 hover:text-accent disabled:opacity-50"><RotateCcw size={12} />復元</button>}
                {purge && <button disabled={busy} onClick={() => confirm("この問題を完全に削除します。元に戻せません。") && run(() => hardDelete([q.id]))} className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-danger hover:bg-rose-50 disabled:opacity-50"><Trash2 size={12} />完全削除</button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
