"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useQuestionStore } from "@/lib/QuestionsContext";
import { useSuggestions } from "@/lib/suggestions";
import { usePageTitle } from "@/lib/usePageTitle";
import { Suggestion } from "@/lib/types";
import { SuggestionCard } from "@/components/SuggestionCard";

// 修正案の一覧。問題の編集画面で出された、問題文・解答・解説の修正案が、ここに集まる。
export default function SuggestionsPage() {
  usePageTitle("修正案");
  const { user } = useAuth();
  const store = useQuestionStore();
  const { open, loading, error, fetchResolved } = useSuggestions();
  const [mineOnly, setMineOnly] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  const [resolved, setResolved] = useState<Suggestion[] | null>(null);
  const [resolvedError, setResolvedError] = useState("");

  useEffect(() => {
    if (!showResolved || resolved) return;
    let alive = true;
    fetchResolved().then((r) => alive && setResolved(r)).catch((e) => { console.error(e); alive && setResolvedError("対応済みの修正案を読み込めませんでした"); });
    return () => { alive = false; };
  }, [showResolved, resolved, fetchResolved]);

  const all = useMemo(() => store.all, [store.all]);
  const byId = useMemo(() => new Map(all.map((q) => [q.id, q])), [all]);
  const list = useMemo(() => open.filter((s) => !mineOnly || s.authorUid === user?.uid), [open, mineOnly, user]);
  const doneList = useMemo(() => (resolved ?? []).filter((s) => !mineOnly || s.authorUid === user?.uid), [resolved, mineOnly, user]);

  if (loading) return <p className="flex items-center gap-2 py-8 text-sm text-slate-400"><Loader2 size={14} className="animate-spin" />読み込み中</p>;
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-800">修正案</h2>
        <p className="text-xs text-slate-400">問題の編集画面で、問題文・解答・解説を直すと、直接は編集できない人の変更が、修正案として、ここに集まります。問題の作成者と、問題統括・管理者が、採用・却下を決めます。</p>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <label className="flex min-h-[40px] items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} className="h-4 w-4" />自分が出した案だけ</label>
        <label className="flex min-h-[40px] items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} className="h-4 w-4" />対応済みも見る</label>
        <span className="text-xs text-slate-400">未対応 {list.length}件</span>
      </div>
      {error && <p role="alert" className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-danger">{error}</p>}
      {list.length === 0 && !error && <p className="rounded-xl border border-dashed border-slate-200 bg-surface p-8 text-center text-sm text-slate-400">{mineOnly ? "あなたが出した、未対応の修正案はありません" : "未対応の修正案はありません"}</p>}
      <ul className="grid gap-3 xl:grid-cols-2">
        {list.map((s) => <li key={s.id}><SuggestionCard s={s} question={byId.get(s.questionId)} showQuestion /></li>)}
      </ul>

      {showResolved && (
        <section className="mt-8">
          <h3 className="mb-2 text-sm font-medium text-slate-600">対応済み（新しい順・最大100件の範囲）</h3>
          {resolvedError && <p role="alert" className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-danger">{resolvedError}</p>}
          {!resolved && !resolvedError && <p className="flex items-center gap-2 py-4 text-sm text-slate-400"><Loader2 size={14} className="animate-spin" />読み込み中</p>}
          {resolved && doneList.length === 0 && <p className="text-sm text-slate-300">ありません</p>}
          <ul className="grid gap-3 opacity-90 xl:grid-cols-2">
            {doneList.map((s) => <li key={s.id}><SuggestionCard s={s} question={byId.get(s.questionId)} showQuestion /></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
