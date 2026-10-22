"use client";

import { toMillis } from "./time";
import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "./firebase";
import { HistoryEntry } from "./types";


// 変更履歴はステータス／校正状態の変更のみを記録する。
// 本文・解説などは打鍵のたびにdebounce保存されるため、
// それらまで履歴化すると書き込み回数が跳ね上がり無料枠を圧迫する。
// 「何が採用/不採用になったか」「校正がどう進んだか」という
// 意思決定の追跡だけに絞るのが無料枠運用との現実的な折衷案。
export function useHistory(setId: string, questionId: string | null) {
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

  return { history };
}
