"use client";

import { useEffect, useState } from "react";
import { Shuffle, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useQuestions } from "@/lib/useQuestions";
import { useSetContext } from "@/lib/SetContext";
import { InlineQuestionEditor } from "@/components/InlineQuestionEditor";
import { Question } from "@/lib/types";

export default function AdoptedPage() {
  const { set, role } = useSetContext();
  const { user } = useAuth();
  const { questions, updateQuestion, deleteQuestion, findDuplicate } = useQuestions(set.id);
  const [orderIds, setOrderIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const adopted = questions.filter((q) => q.status === "adopted");

  useEffect(() => {
    setOrderIds((prev) => {
      const currentIds = adopted.map((q) => q.id);
      const kept = prev.filter((id) => currentIds.includes(id));
      const added = currentIds.filter((id) => !kept.includes(id));
      return [...kept, ...added];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adopted.map((q) => q.id).join(",")]);

  function shuffle() {
    setOrderIds((prev) => {
      const arr = [...prev];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    });
  }

  const displayed = orderIds
    .map((id) => adopted.find((q) => q.id === id))
    .filter((q): q is Question => Boolean(q));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">採用済み {displayed.length}問</p>
        <button
          onClick={shuffle}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm hover:border-brand-300 hover:text-brand-600"
        >
          <Shuffle size={13} />
          シャッフル
        </button>
      </div>

      {displayed.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          まだ採用された問題がありません
        </p>
      )}

      <div className="space-y-2">
        {displayed.map((q, i) => (
          <div key={q.id}>
            {expandedId === q.id ? (
              <div>
                <button
                  onClick={() => setExpandedId(null)}
                  className="mb-1.5 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
                >
                  <ChevronUp size={13} />
                  閉じる
                </button>
                <InlineQuestionEditor
                  setId={set.id}
                  question={q}
                  role={role}
                  uid={user?.uid}
                  genres={set.genres}
                  onUpdate={updateQuestion}
                  onDelete={async (id) => {
                    if (confirm("この問題を削除しますか？")) {
                      await deleteQuestion(id);
                      setExpandedId(null);
                    }
                  }}
                  findDuplicate={findDuplicate}
                />
              </div>
            ) : (
              <button
                onClick={() => setExpandedId(q.id)}
                className="flex w-full items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-3.5 text-left text-sm shadow-sm hover:border-brand-300"
              >
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-xs text-slate-300">{i + 1}問目</p>
                  <p className="truncate text-slate-700">{q.body || "（未入力）"}</p>
                  <p className="truncate text-brand-600">{q.answer || "（未入力）"}</p>
                </div>
                <ChevronDown size={16} className="shrink-0 text-slate-300" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
