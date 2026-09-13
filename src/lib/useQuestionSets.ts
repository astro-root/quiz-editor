"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { QuestionSet } from "./types";
import { useAuth } from "./auth-context";

function toMillis(v: any): number {
  if (!v) return 0;
  if (typeof v.toMillis === "function") return v.toMillis();
  return 0;
}

function toSet(id: string, data: any): QuestionSet {
  return {
    id,
    name: data.name,
    ownerId: data.ownerId,
    members: data.members ?? {},
    memberProfiles: data.memberProfiles ?? {},
    genres: data.genres ?? [],
    noticeBody: data.noticeBody ?? "",
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  };
}

export function useQuestionSets() {
  const { user } = useAuth();
  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSets([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "questionSets"),
      where(`members.${user.uid}`, "in", ["admin", "supervisor", "writer", "viewer"])
    );
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => toSet(d.id, d.data()));
      rows.sort((a, b) => b.updatedAt - a.updatedAt);
      setSets(rows);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  async function createQuestionSet(name: string) {
    if (!user) throw new Error("not authenticated");
    const ref = await addDoc(collection(db, "questionSets"), {
      name,
      ownerId: user.uid,
      members: { [user.uid]: "admin" },
      memberProfiles: {
        [user.uid]: {
          email: user.email ?? "",
          displayName: user.displayName ?? "",
        },
      },
      genres: [],
      noticeBody: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  }

  return { sets, loading, createQuestionSet };
}

// 単一の問題セットをリアルタイム購読する（役割変更が即座に反映されるように）。
export function useQuestionSet(setId: string) {
  const [set, setSet] = useState<QuestionSet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!setId) return;
    const unsub = onSnapshot(doc(db, "questionSets", setId), (snap) => {
      setSet(snap.exists() ? toSet(snap.id, snap.data()) : null);
      setLoading(false);
    });
    return unsub;
  }, [setId]);

  async function addGenre(genre: string) {
    const trimmed = genre.trim();
    if (!trimmed) return;
    await updateDoc(doc(db, "questionSets", setId), {
      genres: arrayUnion(trimmed),
      updatedAt: serverTimestamp(),
    });
  }

  async function updateNotice(noticeBody: string) {
    await updateDoc(doc(db, "questionSets", setId), {
      noticeBody,
      updatedAt: serverTimestamp(),
    });
  }

  return { set, loading, addGenre, updateNotice };
}
