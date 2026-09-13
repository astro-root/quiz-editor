"use client";

import { useEffect, useRef, useState } from "react";
import { Shuffle, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useQuestions } from "@/lib/useQuestions";
import { useHistory } from "@/lib/useHistory";
import { useRevisions } from "@/lib/useRevisions";
import { useSetContext } from "@/lib/SetContext";
import { shouldLogRevision } from "@/lib/permissions";
import { QuestionCard } from "@/components/QuestionCard";
import { Question, Role } from "@/lib/types";

type SaveState = "idle" | "saving" | "saved" | "error";

// 展開時のみ、自分専用のdebounce保存・履歴・改訂ロジックを持つ小さなエディタ。
function AdoptedEditor({
  setId,
  question,
  role,
  uid,
  genres,
  onUpdate,
  onDelete,
  findDuplicate,
}: {
  setId: string;
  question: Question;
  role: Role;
  uid: string | undefined;
  genres: string[];
  onUpdate: (id: string, patch: Partial<Question>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  findDuplicate: (body: string, excludeId?: string) => Question | null;
}) {
  const [draft, setDraft] = useState(question);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const baseline = useRef({ body: question.body, answer: question.answer });
  const revisionLogged = useRef(false);

  const { history, logChange } = useHistory(setId, question.id);
  const { revisions, saveRevision } = useRevisions(setId, question.id);

  function handleChange(patch: Partial<Question>) {
    if (patch.status && patch.status !== draft.status) {
      logChange(question.id, "status", draft.status, patch.status);
    }
    if (patch.proofreadStatus && patch.proofreadStatus !== draft.proofreadStatus) {
      logChange(question.id, "proofreadStatus", draft.proofreadStatus, patch.proofreadStatus);
    }
    const touchesContent = patch.body !== undefined || patch.answer !== undefined;
    if (touchesContent && shouldLogRevision(role) && !revisionLogged.current) {
      saveRevision(question.id, baseline.current.body, baseline.current.answer);
      revisionLogged.current = true;
    }

    const next = { ...draft, ...patch };
    setDraft(next);
    setSaveState("saving");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        await onUpdate(question.id, patch);
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 600);
  }

  return (
    <QuestionCard
      setId={setId}
      question={draft}
      role={role}
      uid={uid}
      genres={genres}
      saveState={saveState}
      duplicateOf={findDuplicate(draft.body, draft.id)}
      history={history}
      revisions={revisions}
      onChange={handleChange}
      onCreateNext={() => {}}
      onNavigate={() => {}}
      onDelete={() => onDelete(question.id)}
    />
  );
}

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
                <AdoptedEditor
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
