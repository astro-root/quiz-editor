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
import { QuestionComment } from "./types";
import { useAuth } from "./auth-context";

function toMillis(v: any): number {
  if (!v) return 0;
  if (typeof v.toMillis === "function") return v.toMillis();
  return 0;
}

// コメントは役割を問わず（閲覧者でも）自由に付けられるようにする。
// 校正・レビューのやり取りを問題オブジェクトに直接紐付けるための機能。
export function useComments(setId: string, questionId: string | null) {
  const { user } = useAuth();
  const [comments, setComments] = useState<QuestionComment[]>([]);

  useEffect(() => {
    if (!setId || !questionId) {
      setComments([]);
      return;
    }
    const q = query(
      collection(db, "questionSets", setId, "questions", questionId, "comments"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setComments(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            authorUid: data.authorUid ?? "",
            authorName: data.authorName ?? "",
            body: data.body ?? "",
            createdAt: toMillis(data.createdAt),
          };
        })
      );
    });
    return unsub;
  }, [setId, questionId]);

  async function addComment(body: string) {
    if (!user || !questionId || !body.trim()) return;
    await addDoc(
      collection(db, "questionSets", setId, "questions", questionId, "comments"),
      {
        authorUid: user.uid,
        authorName: user.displayName || user.email || "匿名",
        body: body.trim(),
        createdAt: serverTimestamp(),
      }
    );
  }

  return { comments, addComment };
}
