"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuestions } from "@/lib/useQuestions";
import { useHistory } from "@/lib/useHistory";
import { useRevisions } from "@/lib/useRevisions";
import { useSetContext } from "@/lib/SetContext";
import { canCreateQuestion, isEmptyQuestion, shouldLogRevision } from "@/lib/permissions";
import { QuestionCard } from "@/components/QuestionCard";
import { Question } from "@/lib/types";

type SaveState = "idle" | "saving" | "saved" | "error";

export default function WritePage() {
  const { set, role } = useSetContext();
  const { user } = useAuth();
  const setId = set.id;
  const { questions, createQuestion, updateQuestion, deleteQuestion, findDuplicate } =
    useQuestions(setId);

  const [activeIndex, setActiveIndex] = useState(0);
  const [draft, setDraft] = useState<Question | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 問題統括・管理者が編集を始めたときの「改訂前」の値を1問につき1回だけ記録する
  const revisionBaseline = useRef<{ id: string; body: string; answer: string } | null>(null);
  const revisionLogged = useRef<Set<string>>(new Set());

  const { history, logChange } = useHistory(setId, draft?.id ?? null);
  const { revisions, saveRevision } = useRevisions(setId, draft?.id ?? null);

  const canCreate = canCreateQuestion(role);

  // アンマウント時（ページ離脱時）に未入力のカードを削除するため、
  // 最新のdraft/questionsをrefで保持しておく
  const latestDraft = useRef(draft);
  const latestQuestionsLength = useRef(questions.length);
  useEffect(() => {
    latestDraft.current = draft;
    latestQuestionsLength.current = questions.length;
  }, [draft, questions.length]);

  useEffect(() => {
    return () => {
      const d = latestDraft.current;
      if (d && isEmptyQuestion(d) && latestQuestionsLength.current > 1) {
        deleteQuestion(d.id).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (questions.length === 0 && canCreate) {
      createQuestion({ authorName: user?.displayName ?? "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions.length, canCreate]);

  useEffect(() => {
    if (questions[activeIndex]) {
      const q = questions[activeIndex];
      setDraft(q);
      if (revisionBaseline.current?.id !== q.id) {
        revisionBaseline.current = { id: q.id, body: q.body, answer: q.answer };
      }
    }
  }, [activeIndex, questions]);

  function handleChange(patch: Partial<Question>) {
    if (!draft) return;

    if (patch.status && patch.status !== draft.status) {
      logChange(draft.id, "status", draft.status, patch.status);
    }
    if (patch.proofreadStatus && patch.proofreadStatus !== draft.proofreadStatus) {
      logChange(draft.id, "proofreadStatus", draft.proofreadStatus, patch.proofreadStatus);
    }

    const touchesContent = patch.body !== undefined || patch.answer !== undefined;
    if (
      touchesContent &&
      shouldLogRevision(role) &&
      revisionBaseline.current &&
      revisionBaseline.current.id === draft.id &&
      !revisionLogged.current.has(draft.id)
    ) {
      saveRevision(draft.id, revisionBaseline.current.body, revisionBaseline.current.answer);
      revisionLogged.current.add(draft.id);
    }

    const next = { ...draft, ...patch };
    setDraft(next);
    setSaveState("saving");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        await updateQuestion(draft.id, patch);
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 600);
  }

  async function handleCreateNext() {
    if (!canCreate || !draft) return;
    // 今のカードが未入力なら、新しい空欄をさらに作らず今のカードのままにする
    if (isEmptyQuestion(draft)) return;
    const lastAnswered = questions[questions.length - 1];
    await createQuestion({
      tags: lastAnswered?.tags ?? [],
      genre: lastAnswered?.genre ?? "",
      authorName: user?.displayName ?? "",
    });
    setActiveIndex(questions.length);
  }

  async function handleNavigate(direction: "prev" | "next") {
    if (!draft) return;
    // 未入力のまま離れるカードは残さず削除してから移動する
    if (isEmptyQuestion(draft) && questions.length > 1) {
      const idx = activeIndex;
      await deleteQuestion(draft.id);
      setActiveIndex(
        direction === "prev" ? Math.max(0, idx - 1) : Math.min(idx, questions.length - 2)
      );
      return;
    }
    setActiveIndex((i) => {
      if (direction === "prev") return Math.max(0, i - 1);
      return Math.min(questions.length - 1, i + 1);
    });
  }

  async function handleDelete() {
    if (!draft) return;
    if (!confirm("この問題を削除しますか？")) return;
    await deleteQuestion(draft.id);
    setActiveIndex((i) => Math.max(0, i - 1));
  }

  if (!canCreate && questions.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-400">
        閲覧権限のため作問モードは利用できません。管理モードで内容を確認できます。
      </p>
    );
  }

  if (!draft) return null;

  return (
    <>
      <QuestionCard
        key={draft.id}
        setId={setId}
        question={draft}
        role={role}
        uid={user?.uid}
        genres={set.genres}
        saveState={saveState}
        duplicateOf={findDuplicate(draft.body, draft.id)}
        history={history}
        revisions={revisions}
        onChange={handleChange}
        onCreateNext={handleCreateNext}
        onNavigate={handleNavigate}
        onDelete={handleDelete}
        hasPrev={activeIndex > 0}
        hasNext={activeIndex < questions.length - 1}
      />
      <div className="mt-4 space-y-1.5 opacity-60">
        {questions
          .filter((q) => q.id !== draft.id)
          .slice(-3)
          .map((q) => (
            <div key={q.id} className="flex justify-between rounded-lg border border-slate-100 bg-white p-2.5 text-xs">
              <span className="truncate text-slate-500">{q.body || "（未入力）"}</span>
              <span className="text-slate-400">{q.answer}</span>
            </div>
          ))}
      </div>
    </>
  );
}
