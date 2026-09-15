"use client";

import { useEffect, useRef, useState } from "react";
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

// v1〜v2で使っていたロール名（owner/editor）を新ロール名に変換する対応表。
// 新しいロール名（admin/supervisor/writer/viewer）はここに含めない。
const LEGACY_ROLE_MAP: Record<string, string> = {
  owner: "admin",
  editor: "writer",
};

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
// あわせて、開いたユーザー自身の役割が旧バージョンの名称（owner/editor）の
// ままだった場合、自動的に新しい名称に移行する（手動でのFirestore編集を不要にする）。
export function useQuestionSet(setId: string) {
  const { user } = useAuth();
  const [set, setSet] = useState<QuestionSet | null>(null);
  const [loading, setLoading] = useState(true);
  const migratingRef = useRef(false);

  useEffect(() => {
    if (!setId) return;
    const unsub = onSnapshot(doc(db, "questionSets", setId), (snap) => {
      if (!snap.exists()) {
        setSet(null);
        setLoading(false);
        return;
      }
      const data = snap.data();
      setSet(toSet(snap.id, data));
      setLoading(false);

      if (user && !migratingRef.current) {
        const rawRole = data.members?.[user.uid];
        const mapped = LEGACY_ROLE_MAP[rawRole];
        if (mapped) {
          migratingRef.current = true;
          updateDoc(doc(db, "questionSets", setId), {
            [`members.${user.uid}`]: mapped,
            updatedAt: serverTimestamp(),
          })
            .catch(() => {})
            .finally(() => {
              migratingRef.current = false;
            });
        }
      }
    });
    return unsub;
  }, [setId, user]);

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
