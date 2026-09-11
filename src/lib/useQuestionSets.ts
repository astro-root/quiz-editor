"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
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
    // members is a map field; Firestore supports querying map keys with
    // dot-path field names, e.g. `members.<uid>` != null.
    const q = query(
      collection(db, "questionSets"),
      where(`members.${user.uid}`, "in", ["owner", "editor", "viewer"])
    );
    const unsub = onSnapshot(q, (snap) => {
      const rows: QuestionSet[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name,
          ownerId: data.ownerId,
          members: data.members ?? {},
          createdAt: toMillis(data.createdAt),
          updatedAt: toMillis(data.updatedAt),
        };
      });
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
      members: { [user.uid]: "owner" },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  }

  return { sets, loading, createQuestionSet };
}
