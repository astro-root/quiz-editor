"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useQuestions } from "@/lib/useQuestions";
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
  const { questions, createQuestion, updateQuestion } = useQuestions(setId);

  const [set, setSet] = useState<QuestionSet | null>(null);
  const [mode, setMode] = useState<Mode>("write");
  const [activeIndex, setActiveIndex] = useState(0);
  const [draft, setDraft] = useState<Question | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [showShare, setShowShare] = useState(false);
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
    const nextId = await createQuestion({
      tags: lastAnswered?.tags ?? [],
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
      <div className="p-6 text-center text-sm text-gray-500">
        この問題セットへのアクセス権がありません。
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link href="/dashboard" className="text-xs text-gray-400 hover:underline">
            ← 一覧へ戻る
          </Link>
          <h1 className="text-lg font-semibold">{set.name}</h1>
        </div>
        {isOwner && (
          <button
            onClick={() => setShowShare(true)}
            className="rounded-lg border border-gray-200 px-3 py-1 text-sm hover:bg-gray-50"
          >
            共有
          </button>
        )}
      </div>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setMode("write")}
          className={`rounded-lg px-3 py-1.5 text-sm ${
            mode === "write"
              ? "bg-blue-600 text-white"
              : "text-gray-500 hover:bg-gray-100"
          }`}
        >
          作問
        </button>
        <button
          onClick={() => setMode("manage")}
          className={`rounded-lg px-3 py-1.5 text-sm ${
            mode === "manage"
              ? "bg-blue-600 text-white"
              : "text-gray-500 hover:bg-gray-100"
          }`}
        >
          管理
        </button>
      </div>

      {mode === "write" ? (
        canEdit ? (
          draft && (
            <>
              <QuestionCard
                key={draft.id}
                question={draft}
                saveState={saveState}
                onChange={handleChange}
                onCreateNext={handleCreateNext}
                onNavigate={handleNavigate}
              />
              <div className="mt-4 space-y-1 opacity-60">
                {questions
                  .filter((q) => q.id !== draft.id)
                  .slice(-3)
                  .map((q) => (
                    <div
                      key={q.id}
                      className="flex justify-between rounded-lg border border-gray-100 p-2 text-xs"
                    >
                      <span className="truncate">{q.body || "（未入力）"}</span>
                      <span className="text-gray-400">{q.answer}</span>
                    </div>
                  ))}
              </div>
            </>
          )
        ) : (
          <p className="p-4 text-center text-sm text-gray-400">
            閲覧権限のため作問モードは利用できません。管理モードで内容を確認できます。
          </p>
        )
      ) : (
        <QuestionList questions={questions} />
      )}

      {showShare && set && (
        <ShareDialog set={set} isOwner={isOwner} onClose={() => setShowShare(false)} />
      )}
    </div>
  );
}
