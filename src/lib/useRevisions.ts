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
import { Revision } from "./types";
import { useAuth } from "./auth-context";

function toMillis(v: any): number {
  if (!v) return 0;
  if (typeof v.toMillis === "function") return v.toMillis();
  return 0;
}

// 問題文・答えの改訂スナップショット。問題統括・管理者が編集する際、
// 変更前の内容をここに保存してから更新する（permissions.shouldLogRevision参照）。
export function useRevisions(setId: string, questionId: string | null) {
  const { user } = useAuth();
  const [revisions, setRevisions] = useState<Revision[]>([]);

  useEffect(() => {
    if (!setId || !questionId) {
      setRevisions([]);
      return;
    }
    const q = query(
      collection(db, "questionSets", setId, "questions", questionId, "revisions"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setRevisions(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            body: data.body ?? "",
            answer: data.answer ?? "",
            editedByUid: data.editedByUid ?? "",
            editedByName: data.editedByName ?? "",
            createdAt: toMillis(data.createdAt),
          };
        })
      );
    });
    return unsub;
  }, [setId, questionId]);

  async function saveRevision(questionId: string, body: string, answer: string) {
    if (!user) return;
    await addDoc(
      collection(db, "questionSets", setId, "questions", questionId, "revisions"),
      {
        body,
        answer,
        editedByUid: user.uid,
        editedByName: user.displayName || user.email || "匿名",
        createdAt: serverTimestamp(),
      }
    );
  }

  return { revisions, saveRevision };
}
