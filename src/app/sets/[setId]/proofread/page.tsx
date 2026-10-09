"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuestionStore } from "@/lib/QuestionsContext";
import { useSetContext } from "@/lib/SetContext";
import { QuestionBrowser } from "@/components/QuestionBrowser";
import { EMPTY_FILTERS, Filters } from "@/lib/search";

const presets: { label: string; f: Partial<Filters> }[] = [
  { label: "すべて", f: {} },
  { label: "自分の担当", f: { assignee: "me" } },
  { label: "未着手", f: { proofread: "unchecked" } },
  { label: "確認中", f: { proofread: "in_review" } },
  { label: "確認済み", f: { proofread: "approved" } },
  { label: "要修正", f: { proofread: "needs_fix" } },
];

// 裏どり画面。出典を一覧に出し、確認状態・担当者で絞り込んで進める。
export default function ProofreadPage() {
  const { set } = useSetContext();
  const { live } = useQuestionStore();
  const { user } = useAuth();
  const [key, setKey] = useState(0);
  const storageKey = `qraft:f:${set.id}:proofread`;

  function applyPreset(f: Partial<Filters>) {
    try { sessionStorage.setItem(storageKey, JSON.stringify({ ...EMPTY_FILTERS, ...f })); } catch { /* noop */ }
    setKey((k) => k + 1); // QuestionBrowserを作り直し、保存済みフィルタを読み込ませる
  }

  const mineCount = live.filter((q) => q.assigneeUid === user?.uid).length;
  const doneCount = live.filter((q) => q.proofreadStatus === "approved").length;

  return (
    <QuestionBrowser
      key={key}
      base={live}
      storageKey={storageKey}
      header={
        <div className="mb-3">
          <p className="mb-2 text-xs text-slate-400">
            自分の担当 {mineCount}問 ／ 確認済み {doneCount}／{live.length}問　— 問題をクリックすると出典を確認しながら状態を更新できます
          </p>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p) => (
              <button key={p.label} onClick={() => applyPreset(p.f)} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 hover:border-brand-300 hover:text-brand-600">
                {p.label}
              </button>
            ))}
          </div>
        </div>
      }
    />
  );
}
