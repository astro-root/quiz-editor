"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, PencilLine, LayoutGrid, Users2 } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useQuestions } from "@/lib/useQuestions";
import { useHistory } from "@/lib/useHistory";
import { QuestionCard } from "@/components/QuestionCard";
import { QuestionList } from "@/components/QuestionList";
import { ShareDialog } from "@/components/ShareDialog";
import { QuestionSet, Question } from "@/lib/types";

type Mode = "write" | "manage";
type SaveState = "idle" | "saving" | "saved" | "error";

export default function QuestionSetPage() {
  const { setId } = useParams<{ setId: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { questions, createQuestion, updateQuestion, importQuestions, findDuplicate } =
    useQuestions(setId);

  const [set, setSet] = useState<QuestionSet | null>(null);
  const [mode, setMode] = useState<Mode>("write");
  const [activeIndex, setActiveIndex] = useState(0);
  const [draft, setDraft] = useState<Question | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [showShare, setShowShare] = useState(false);
  const { history, logChange } = useHistory(setId, draft?.id ?? null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    async function loadSet() {
      const snap = await getDoc(doc(db, "questionSets", setId));
      if (snap.exists()) {
        const data = snap.data();
        setSet({
          id: snap.id,
          name: data.name,
          ownerId: data.ownerId,
          members: data.members ?? {},
          memberProfiles: data.memberProfiles ?? {},
          createdAt: 0,
          updatedAt: 0,
        });
      }
    }
    loadSet();
  }, [setId]);

  // 最初の問題がまだ無い問題セットには、開いた時点で1問自動生成する
  useEffect(() => {
    if (questions.length === 0 && user) {
      createQuestion({ authorName: user.displayName ?? "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions.length, user]);

  useEffect(() => {
    if (questions[activeIndex]) setDraft(questions[activeIndex]);
  }, [activeIndex, questions]);

  const role = useMemo(() => {
    if (!set || !user) return null;
    return set.members[user.uid] ?? null;
  }, [set, user]);
  const canEdit = role === "owner" || role === "editor";
  const isOwner = role === "owner";

  function handleChange(patch: Partial<Question>) {
    if (!draft) return;
    if (patch.status && patch.status !== draft.status) {
      logChange(draft.id, "status", draft.status, patch.status);
    }
    if (patch.proofreadStatus && patch.proofreadStatus !== draft.proofreadStatus) {
      logChange(draft.id, "proofreadStatus", draft.proofreadStatus, patch.proofreadStatus);
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
    const lastAnswered = questions[questions.length - 1];
    await createQuestion({
      tags: lastAnswered?.tags ?? [],
      genre: lastAnswered?.genre ?? "",
      authorName: user?.displayName ?? "",
    });
    setActiveIndex(questions.length); // 新規追加分は末尾に来る
  }

  function handleNavigate(direction: "prev" | "next") {
    setActiveIndex((i) => {
      if (direction === "prev") return Math.max(0, i - 1);
      return Math.min(questions.length - 1, i + 1);
    });
  }

  if (authLoading || !set) return null;

  if (!role) {
    return (
      <div className="p-6 text-center text-sm text-slate-500">
        この問題セットへのアクセス権がありません。
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-6 pb-16 pt-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <Link
              href="/dashboard"
              className="mb-1 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
            >
              <ArrowLeft size={12} /> 一覧へ戻る
            </Link>
            <h1 className="text-lg font-semibold text-slate-800">{set.name}</h1>
          </div>
          {isOwner && (
            <button
              onClick={() => setShowShare(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 shadow-sm hover:border-brand-300 hover:text-brand-600"
            >
              <Users2 size={15} />
              共有
            </button>
          )}
        </div>

        <div className="mb-5 inline-flex rounded-xl bg-slate-100 p-1">
          <button
            onClick={() => setMode("write")}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition ${
              mode === "write"
                ? "bg-white text-brand-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <PencilLine size={15} />
            作問
          </button>
          <button
            onClick={() => setMode("manage")}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition ${
              mode === "manage"
                ? "bg-white text-brand-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <LayoutGrid size={15} />
            管理
          </button>
        </div>

        {mode === "write" ? (
          canEdit ? (
            draft && (
              <>
                <QuestionCard
                  key={draft.id}
                  setId={setId}
                  question={draft}
                  saveState={saveState}
                  duplicateOf={findDuplicate(draft.body, draft.id)}
                  history={history}
                  onChange={handleChange}
                  onCreateNext={handleCreateNext}
                  onNavigate={handleNavigate}
                />
                <div className="mt-4 space-y-1.5 opacity-60">
                  {questions
                    .filter((q) => q.id !== draft.id)
                    .slice(-3)
                    .map((q) => (
                      <div
                        key={q.id}
                        className="flex justify-between rounded-lg border border-slate-100 bg-white p-2.5 text-xs"
                      >
                        <span className="truncate text-slate-500">
                          {q.body || "（未入力）"}
                        </span>
                        <span className="text-slate-400">{q.answer}</span>
                      </div>
                    ))}
                </div>
              </>
            )
          ) : (
            <p className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-400">
              閲覧権限のため作問モードは利用できません。管理モードで内容を確認できます。
            </p>
          )
        ) : (
          <QuestionList questions={questions} canEdit={canEdit} onImportRows={importQuestions} />
        )}

        {showShare && set && (
          <ShareDialog set={set} isOwner={isOwner} onClose={() => setShowShare(false)} />
        )}
      </div>
    </div>
  );
}
