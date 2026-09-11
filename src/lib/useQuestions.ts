"use client";

import { useEffect, useState } from "react";
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
import { Question } from "./types";
import { useAuth } from "./auth-context";

function toMillis(v: any): number {
  if (!v) return 0;
  if (typeof v.toMillis === "function") return v.toMillis();
  return 0;
}

export function useQuestions(setId: string) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

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
          explanation: data.explanation ?? "",
          source: data.source ?? "",
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
      setLoading(false);
    });
    return unsub;
  }, [setId]);

  // 新しい問題は常に末尾に追加する。orderは連続した数値ではなく
  // 「前の問題のorder + 1」を使うことで、将来の並び替え時に
  // 挿入位置の前後のorderの平均値を使って全件書き換えを避けられる。
  async function createQuestion(defaults?: {
    tags?: string[];
    authorName?: string;
  }) {
    if (!user) throw new Error("not authenticated");
    const lastOrder = questions.length
      ? questions[questions.length - 1].order
      : 0;
    const ref = await addDoc(collection(db, "questionSets", setId, "questions"), {
      body: "",
      answer: "",
      altAnswers: [],
      explanation: "",
      source: "",
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
  }

  async function updateQuestion(questionId: string, patch: Partial<Question>) {
    await updateDoc(doc(db, "questionSets", setId, "questions", questionId), {
      ...patch,
      updatedAt: serverTimestamp(),
    });
  }

  // 並び替え：移動先の前後2問のorderの平均値を新しいorderにする。
  // 隙間が無くなった場合のみ、呼び出し側で再採番することを想定。
  function orderBetween(before?: number, after?: number): number {
    if (before === undefined && after === undefined) return 1;
    if (before === undefined) return (after as number) - 1;
    if (after === undefined) return before + 1;
    return (before + after) / 2;
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
    orderBetween,
  };
}
