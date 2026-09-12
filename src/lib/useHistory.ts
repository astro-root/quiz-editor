"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { HistoryEntry } from "./types";
import { useAuth } from "./auth-context";

function toMillis(v: any): number {
  if (!v) return 0;
  if (typeof v.toMillis === "function") return v.toMillis();
  return 0;
}

// 変更履歴はステータス／校正状態の変更のみを記録する。
// 本文・解説などは打鍵のたびにdebounce保存されるため、
// それらまで履歴化すると書き込み回数が跳ね上がり無料枠を圧迫する。
// 「何が採用/不採用になったか」「校正がどう進んだか」という
// 意思決定の追跡だけに絞るのが無料枠運用との現実的な折衷案。
export function useHistory(setId: string, questionId: string | null) {
  const { user } = useAuth();
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    if (!setId || !questionId) {
      setHistory([]);
      return;
    }
    const q = query(
      collection(db, "questionSets", setId, "questions", questionId, "history"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setHistory(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            field: data.field,
            from: data.from,
            to: data.to,
            authorUid: data.authorUid ?? "",
            authorName: data.authorName ?? "",
            createdAt: toMillis(data.createdAt),
          };
        })
      );
    });
    return unsub;
  }, [setId, questionId]);

  async function logChange(
    questionId: string,
    field: "status" | "proofreadStatus",
    from: string,
    to: string
  ) {
    if (!user || from === to) return;
    await addDoc(
      collection(db, "questionSets", setId, "questions", questionId, "history"),
      {
        field,
        from,
        to,
        authorUid: user.uid,
        authorName: user.displayName || user.email || "匿名",
        createdAt: serverTimestamp(),
      }
    );
  }

  return { history, logChange };
}
