"use client";

import { useState } from "react";
import { AlertTriangle, Check, Loader2, Undo2, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useSetContext } from "@/lib/SetContext";
import { useQuestionStore } from "@/lib/QuestionsContext";
import { useSuggestions } from "@/lib/suggestions";
import { Question, Suggestion, suggestionFieldLabel, suggestionStatusLabel } from "@/lib/types";
import { TextDiff } from "./TextDiff";

const statusStyle: Record<Suggestion["status"], string> = {
  open: "bg-amber-50 text-warn",
  accepted: "bg-emerald-50 text-ok",
  rejected: "bg-rose-50 text-danger",
  withdrawn: "bg-slate-100 text-slate-500",
};

// 修正案1件の表示。元の内容との差分と、理由、採否のボタン。
// 採否を決められるのは、問題の作成者と、問題統括・管理者。提案した本人は、未対応のうちなら、取り下げられる。
export function SuggestionCard({ s, question, showQuestion = false, onDone }: { s: Suggestion; question?: Question; showQuestion?: boolean; onDone?: () => void }) {
  const { user } = useAuth();
  const { role, personOf } = useSetContext();
  const store = useQuestionStore();
  const { setStatus } = useSuggestions();
  const [busy, setBusy] = useState<"" | "accept" | "reject" | "withdraw">("");
  const [error, setError] = useState("");

  const uid = user?.uid;
  const isOpen = s.status === "open";
  const canDecide = isOpen && !!uid && (role === "admin" || role === "supervisor" || question?.authorUid === uid);
  const canWithdraw = isOpen && !!uid && s.authorUid === uid;
  const current = question ? question[s.field] : null;
  const outdated = isOpen && current !== null && current !== s.before; // 提案のあとに、元の内容が変わった
  const author = personOf(s.authorUid, s.authorName);

  async function run(kind: "accept" | "reject" | "withdraw") {
    setBusy(kind); setError("");
    try {
      if (kind === "accept") {
        if (!question) throw new Error("対象の問題が見つかりません（削除された可能性があります）");
        await store.updateQuestion(question.id, { [s.field]: s.proposed });
        await setStatus(s.id, "accepted");
      } else {
        await setStatus(s.id, kind === "reject" ? "rejected" : "withdrawn");
      }
      onDone?.();
    } catch (e: any) {
      console.error(e);
      setError(e?.code === "permission-denied" ? "この操作の権限がありません（採用済みの問題は、問題統括・管理者しか直せません）" : e?.message || "操作に失敗しました");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-surface p-3">
      {showQuestion && question && (
        <div className="mb-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-500">
          <p className="line-clamp-2 break-words">{question.body || "（問題文なし）"}</p>
          <p className="truncate font-medium text-accent">{question.answer || "（解答なし）"}</p>
        </div>
      )}
      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
        <span className="rounded-full bg-violet-50 px-2 py-0.5 text-violet-600">{suggestionFieldLabel[s.field]}</span>
        <span className={`rounded-full px-2 py-0.5 ${statusStyle[s.status]}`}>{suggestionStatusLabel[s.status]}</span>
        <span>{author.name}</span>
        <span>{s.createdAt ? new Date(s.createdAt).toLocaleString("ja-JP") : ""}</span>
        {!isOpen && s.resolvedBy && <span>対応：{personOf(s.resolvedBy).name}</span>}
      </div>
      <TextDiff before={s.before} after={s.proposed} />
      {s.reason && <p className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-500">理由：{s.reason}</p>}
      {outdated && (
        <div className="mt-2 rounded-lg bg-amber-50 px-2.5 py-2 text-xs text-warn-strong">
          <p className="mb-1 flex items-center gap-1.5 font-medium"><AlertTriangle size={13} />この提案のあとに、{suggestionFieldLabel[s.field]}が変更されています</p>
          <p className="mb-1 text-[11px]">いまの内容と、提案の比較：</p>
          <TextDiff before={current ?? ""} after={s.proposed} className="!text-xs" />
          <p className="mt-1 text-[11px]">採用すると、{suggestionFieldLabel[s.field]}が、提案の内容に置き換わります。</p>
        </div>
      )}
      {error && <p role="alert" className="mt-2 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs text-danger">{error}</p>}
      {(canDecide || canWithdraw) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {canDecide && (
            <>
              <button disabled={!!busy} onClick={() => run("accept")} className="flex min-h-[40px] items-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                {busy === "accept" ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}採用して反映
              </button>
              <button disabled={!!busy} onClick={() => run("reject")} className="flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 bg-surface px-4 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                {busy === "reject" ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}却下
              </button>
            </>
          )}
          {canWithdraw && (
            <button disabled={!!busy} onClick={() => run("withdraw")} className="ml-auto flex min-h-[40px] items-center gap-1.5 rounded-lg px-3 text-xs text-slate-400 hover:bg-slate-50 hover:text-slate-600 disabled:opacity-50">
              <Undo2 size={13} />取り下げる
            </button>
          )}
        </div>
      )}
    </div>
  );
}
