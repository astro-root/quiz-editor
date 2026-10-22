"use client";

import { toMillis } from "./time";
import { useEffect, useRef, useState } from "react";
import { addDoc, arrayUnion, collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { db } from "./firebase";
import { GenreNode, QuestionSet, Round } from "./types";
import { useAuth } from "./auth-context";

const LEGACY_ROLE_MAP: Record<string, string> = { owner: "admin", editor: "writer" };


function toSet(id: string, data: any): QuestionSet {
  return {
    id,
    name: data.name ?? "",
    ownerId: data.ownerId ?? "",
    members: data.members ?? {},
    memberProfiles: data.memberProfiles ?? {},
    genres: data.genres ?? [],
    genreTree: data.genreTree ?? [],
    rounds: data.rounds ?? [],
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
      where(`members.${user.uid}`, "in", ["admin", "supervisor", "writer", "checker", "viewer"])
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => toSet(d.id, d.data()));
        rows.sort((a, b) => b.updatedAt - a.updatedAt);
        setSets(rows);
        setLoading(false);
      },
      (err) => {
        console.error("問題セットの取得に失敗しました", err);
        setLoading(false);
      }
    );
    return unsub;
  }, [user]);

  async function createQuestionSet(name: string) {
    if (!user) throw new Error("not authenticated");
    const ref = await addDoc(collection(db, "questionSets"), {
      name,
      ownerId: user.uid,
      members: { [user.uid]: "admin" },
      memberProfiles: {
        [user.uid]: { email: user.email ?? "", displayName: user.displayName ?? "", photoURL: user.photoURL ?? "" },
      },
      genres: [],
      genreTree: [],
      rounds: [],
      noticeBody: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  }

  return { sets, loading, createQuestionSet };
}

export interface SetActions {
  saveGenreTree: (tree: GenreNode[]) => Promise<void>;
  saveRounds: (rounds: Round[]) => Promise<void>;
  updateNotice: (body: string) => Promise<void>;
  updateMembers: (patch: Record<string, unknown>) => Promise<void>;
}

// 単一の問題セットをリアルタイム購読する。
export function useQuestionSet(setId: string) {
  const { user } = useAuth();
  const [set, setSet] = useState<QuestionSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const migratingRef = useRef(false);
  const profileRef = useRef(false);

  useEffect(() => {
    if (!setId) return;
    setLoading(true);
    const unsub = onSnapshot(
      doc(db, "questionSets", setId),
      (snap) => {
        if (!snap.exists()) {
          setSet(null);
          setLoading(false);
          return;
        }
        const data = snap.data();
        setSet(toSet(snap.id, data));
        setError(null);
        setLoading(false);

        if (!user) return;
        // 旧ロール名（owner/editor）の自己移行
        const rawRole = data.members?.[user.uid];
        const mapped = LEGACY_ROLE_MAP[rawRole];
        if (mapped && !migratingRef.current) {
          migratingRef.current = true;
          updateDoc(doc(db, "questionSets", setId), {
            [`members.${user.uid}`]: mapped,
            updatedAt: serverTimestamp(),
          })
            .catch((e) => console.error("ロール移行に失敗しました", e))
            .finally(() => (migratingRef.current = false));
        }
        // 自分の表示名・アイコンが変わっていたら自分の分だけ同期（他メンバーの表示を最新に保つ）
        const mine = data.memberProfiles?.[user.uid];
        const name = user.displayName ?? "";
        const photo = user.photoURL ?? "";
        if (
          rawRole && !mapped && !profileRef.current && mine &&
          (mine.displayName !== name || (mine.photoURL ?? "") !== photo)
        ) {
          profileRef.current = true;
          updateDoc(doc(db, "questionSets", setId), {
            [`memberProfiles.${user.uid}`]: { email: mine.email ?? user.email ?? "", displayName: name, photoURL: photo },
            updatedAt: serverTimestamp(),
          })
            .catch((e) => console.error("プロフィール同期に失敗しました", e))
            .finally(() => (profileRef.current = false));
        }
      },
      (err) => {
        console.error("問題セットの購読に失敗しました", err);
        setError(err.code === "permission-denied" ? "denied" : "error");
        setLoading(false);
      }
    );
    return unsub;
  }, [setId, user]);

  const actions: SetActions = {
    async saveGenreTree(tree) {
      await updateDoc(doc(db, "questionSets", setId), { genreTree: tree, updatedAt: serverTimestamp() });
    },
    async saveRounds(rounds) {
      await updateDoc(doc(db, "questionSets", setId), { rounds, updatedAt: serverTimestamp() });
    },
    async updateNotice(noticeBody) {
      await updateDoc(doc(db, "questionSets", setId), { noticeBody, updatedAt: serverTimestamp() });
    },
    async updateMembers(patch) {
      await updateDoc(doc(db, "questionSets", setId), { ...patch, updatedAt: serverTimestamp() });
    },
  };

  return { set, loading, error, actions };
}
