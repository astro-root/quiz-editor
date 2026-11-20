"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { addDoc, collection, doc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { db } from "./firebase";
import { toMillis } from "./time";
import { useAuth } from "./auth-context";
import { Suggestion, SuggestionField, SuggestionStatus } from "./types";

// 修正案。未対応のものだけを、リアルタイムに購読する（読み取りを、少なく保つため）。対応済みは、見たいときに、1回だけ読む。
const toSuggestion = (id: string, d: Record<string, any>): Suggestion => ({
  id,
  questionId: d.questionId ?? "",
  field: d.field === "answer" || d.field === "explanation" ? d.field : "body",
  before: d.before ?? "",
  proposed: d.proposed ?? "",
  reason: d.reason ?? "",
  status: (["open", "accepted", "rejected", "withdrawn"].includes(d.status) ? d.status : "open") as SuggestionStatus,
  authorUid: d.authorUid ?? "",
  authorName: d.authorName ?? "",
  createdAt: toMillis(d.createdAt),
  resolvedBy: d.resolvedBy ?? "",
  resolvedAt: toMillis(d.resolvedAt),
});

interface NewSuggestion { questionId: string; field: SuggestionField; before: string; proposed: string; reason: string }
interface Store {
  open: Suggestion[];
  loading: boolean;
  error: string;
  create: (s: NewSuggestion) => Promise<void>;
  setStatus: (id: string, status: Exclude<SuggestionStatus, "open">) => Promise<void>;
  fetchResolved: () => Promise<Suggestion[]>;
}
const Ctx = createContext<Store | null>(null);

export function SuggestionsProvider({ setId, children }: { setId: string; children: ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid;
  const [open, setOpen] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!setId || !uid) return;
    setLoading(true);
    const q = query(collection(db, "questionSets", setId, "suggestions"), where("status", "==", "open"));
    return onSnapshot(
      q,
      (snap) => {
        setOpen(snap.docs.map((d) => toSuggestion(d.id, d.data())).sort((a, b) => b.createdAt - a.createdAt));
        setLoading(false);
        setError("");
      },
      (e) => { console.error("修正案の取得に失敗しました", e); setError("修正案を読み込めませんでした"); setLoading(false); },
    );
  }, [setId, uid]);

  const create = useCallback(async (s: NewSuggestion) => {
    if (!user) throw new Error("ログインが必要です");
    await addDoc(collection(db, "questionSets", setId, "suggestions"), {
      questionId: s.questionId, field: s.field, before: s.before, proposed: s.proposed, reason: s.reason.trim().slice(0, 500),
      status: "open", authorUid: user.uid, authorName: (user.displayName || "匿名").slice(0, 60),
      resolvedBy: "", resolvedAt: null, createdAt: serverTimestamp(),
    });
  }, [setId, user]);

  const setStatus = useCallback(async (id: string, status: Exclude<SuggestionStatus, "open">) => {
    if (!user) throw new Error("ログインが必要です");
    await updateDoc(doc(db, "questionSets", setId, "suggestions", id), { status, resolvedBy: user.uid, resolvedAt: serverTimestamp() });
  }, [setId, user]);

  const fetchResolved = useCallback(async () => {
    // 新しい順に100件を読み、対応済みだけを残す（状態での絞り込みと並び替えを一緒にすると、別にインデックスが要るため）
    const snap = await getDocs(query(collection(db, "questionSets", setId, "suggestions"), orderBy("createdAt", "desc"), limit(100)));
    return snap.docs.map((d) => toSuggestion(d.id, d.data())).filter((x) => x.status !== "open");
  }, [setId]);

  const value = useMemo(() => ({ open, loading, error, create, setStatus, fetchResolved }), [open, loading, error, create, setStatus, fetchResolved]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSuggestions() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSuggestions must be used within SuggestionsProvider");
  return c;
}
