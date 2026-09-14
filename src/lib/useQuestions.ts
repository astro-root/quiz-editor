"use client";

import { useEffect, useRef, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { MAX_SOURCES, Question } from "./types";
import { isEmptyQuestion } from "./permissions";
import { useAuth } from "./auth-context";

function toMillis(v: any): number {
  if (!v) return 0;
  if (typeof v.toMillis === "function") return v.toMillis();
  return 0;
}

function padSources(sources: string[] | undefined): string[] {
  const arr = (sources ?? []).slice(0, MAX_SOURCES);
  while (arr.length < MAX_SOURCES) arr.push("");
  return arr;
}

export function useQuestions(setId: string) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  // Ctrl/Cmd+Enter連打・キーリピートで複数回作成されるのを防ぐロック
  const creatingRef = useRef(false);
  // 空欄のまま残った問題の自動削除で、同じIDに何度も削除を試みないためのガード
  const cleanupAttempted = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!setId) return;
    const q = query(
      collection(db, "questionSets", setId, "questions"),
      orderBy("order", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const rows: Question[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          body: data.body ?? "",
          answer: data.answer ?? "",
          altAnswers: data.altAnswers ?? [],
          judgingCriteria: data.judgingCriteria ?? "",
          genre: data.genre ?? "",
          explanation: data.explanation ?? "",
          sources: padSources(data.sources ?? (data.source ? [data.source] : [])),
          memo: data.memo ?? "",
          tags: data.tags ?? [],
          authorUid: data.authorUid ?? "",
          authorName: data.authorName ?? "",
          status: data.status ?? "draft",
          proofreadStatus: data.proofreadStatus ?? "unchecked",
          order: data.order ?? 0,
          createdAt: toMillis(data.createdAt),
          updatedAt: toMillis(data.updatedAt),
        };
      });
      setQuestions(rows);

      // 未入力（問題文・答えとも空欄）のまま残った問題が複数あれば、
      // 直近の1件だけ残して残りは自動的に削除する。
      // 削除権限がない（他人の問題を作問者が触れないなど）場合は
      // 静かに失敗させ、以後同じIDへの再試行はしない。
      const emptyOnes = rows.filter(isEmptyQuestion);
      if (emptyOnes.length > 1) {
        const toRemove = emptyOnes.slice(0, -1);
        for (const q of toRemove) {
          if (cleanupAttempted.current.has(q.id)) continue;
          cleanupAttempted.current.add(q.id);
          deleteDoc(doc(db, "questionSets", setId, "questions", q.id)).catch(() => {
            // 権限不足などは無視する（他ユーザーのセッションが削除する可能性もある）
          });
        }
      }
      setLoading(false);
    });
    return unsub;
  }, [setId]);

  async function createQuestion(defaults?: {
    tags?: string[];
    genre?: string;
    authorName?: string;
  }) {
    if (!user) throw new Error("not authenticated");
    if (creatingRef.current) return null;
    creatingRef.current = true;
    try {
      const lastOrder = questions.length
        ? questions[questions.length - 1].order
        : 0;
      const ref = await addDoc(collection(db, "questionSets", setId, "questions"), {
        body: "",
        answer: "",
        altAnswers: [],
        judgingCriteria: "",
        genre: defaults?.genre ?? "",
        explanation: "",
        sources: ["", "", "", "", ""],
        memo: "",
        tags: defaults?.tags ?? [],
        authorUid: user.uid,
        authorName: defaults?.authorName ?? user.displayName ?? "",
        status: "draft",
        proofreadStatus: "unchecked",
        order: lastOrder + 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return ref.id;
    } finally {
      creatingRef.current = false;
    }
  }

  async function updateQuestion(questionId: string, patch: Partial<Question>) {
    await updateDoc(doc(db, "questionSets", setId, "questions", questionId), {
      ...patch,
      updatedAt: serverTimestamp(),
    });
  }

  async function importQuestions(
    list: {
      body: string;
      answer: string;
      altAnswers: string[];
      judgingCriteria: string;
      explanation: string;
      sources: string[];
      genre: string;
      tags: string[];
      memo: string;
      status: Question["status"];
      proofreadStatus: Question["proofreadStatus"];
    }[]
  ) {
    if (!user) throw new Error("not authenticated");
    let order = questions.length ? questions[questions.length - 1].order : 0;
    for (const item of list) {
      order += 1;
      await addDoc(collection(db, "questionSets", setId, "questions"), {
        ...item,
        sources: padSources(item.sources),
        authorUid: user.uid,
        authorName: user.displayName ?? "",
        order,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  }

  // 完全一致の問題文がすでに存在するかどうかの簡易チェック。
  function findDuplicate(body: string, excludeId?: string): Question | null {
    const trimmed = body.trim();
    if (!trimmed) return null;
    return (
      questions.find((q) => q.id !== excludeId && q.body.trim() === trimmed) ??
      null
    );
  }

  async function deleteQuestion(questionId: string) {
    await deleteDoc(doc(db, "questionSets", setId, "questions", questionId));
  }

  return {
    questions,
    loading,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    importQuestions,
    findDuplicate,
  };
}
