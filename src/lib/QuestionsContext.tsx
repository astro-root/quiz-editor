"use client";

import { toMillis } from "./time";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import {
  collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { HistoryField, MAX_SOURCES, Question } from "./types";
import { isEmptyQuestion } from "./permissions";
import { useAuth } from "./auth-context";

function padSources(sources: string[] | undefined): string[] {
  const arr = (sources ?? []).slice(0, MAX_SOURCES);
  while (arr.length < MAX_SOURCES) arr.push("");
  return arr;
}

export function normalizeQuestion(id: string, data: any): Question {
  return {
    id,
    body: typeof data.body === "string" ? data.body : "",
    answer: typeof data.answer === "string" ? data.answer : "",
    altAnswers: Array.isArray(data.altAnswers) ? data.altAnswers : [],
    judgingCriteria: data.judgingCriteria ?? "",
    // 旧データは genre（文字列）のみ。移行済みノードのIDは旧ジャンル名と同一
    genreId: data.genreId ?? data.genre ?? "",
    subGenreId: data.subGenreId ?? "",
    explanation: data.explanation ?? "",
    sources: padSources(data.sources ?? (data.source ? [data.source] : [])),
    memo: data.memo ?? "",
    tags: Array.isArray(data.tags) ? data.tags : [],
    authorUid: data.authorUid ?? "",
    authorName: data.authorName ?? "",
    status: data.status ?? "draft",
    proofreadStatus: data.proofreadStatus ?? "unchecked",
    assigneeUid: data.assigneeUid ?? "",
    roundId: data.roundId ?? "",
    playOrder: typeof data.playOrder === "number" ? data.playOrder : null,
    order: typeof data.order === "number" ? data.order : 0,
    deletedAt: data.deletedAt ? toMillis(data.deletedAt) || 1 : null,
    deletedBy: data.deletedBy ?? "",
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  };
}

export type QuestionInput = Partial<Omit<Question, "id" | "createdAt" | "updatedAt" | "deletedAt" | "deletedBy">>;
export interface HistoryLog { field: HistoryField; from: string; to: string }

interface Store {
  loading: boolean;
  error: string | null;
  all: Question[];
  live: Question[]; // 削除されておらず、問題文か答えが入力されているもの
  trash: Question[];
  emptyLegacy: Question[]; // 過去のバグで残った完全な空問題
  byId: Map<string, Question>;
  createQuestion: (input: QuestionInput) => Promise<string>;
  updateQuestion: (id: string, patch: QuestionInput, logs?: HistoryLog[]) => Promise<void>;
  softDelete: (id: string) => Promise<void>;
  restore: (id: string) => Promise<void>;
  hardDelete: (ids: string[]) => Promise<void>;
  setPlayOrders: (orders: { id: string; playOrder: number | null }[]) => Promise<void>;
  importQuestions: (rows: QuestionInput[], onProgress?: (done: number) => void) => Promise<void>;
  findDuplicate: (body: string, excludeId?: string) => Question | null;
}

const Ctx = createContext<Store | null>(null);

function baseDoc(input: QuestionInput, uid: string, authorName: string, order: number) {
  const genreId = input.genreId ?? "";
  return {
    body: (input.body ?? "").trim(),
    answer: (input.answer ?? "").trim(),
    altAnswers: input.altAnswers ?? [],
    judgingCriteria: input.judgingCriteria ?? "",
    genre: genreId, // 旧フィールド。genreId と常に同値
    genreId,
    subGenreId: input.subGenreId ?? "",
    explanation: input.explanation ?? "",
    sources: padSources(input.sources),
    memo: input.memo ?? "",
    tags: input.tags ?? [],
    authorUid: uid,
    authorName,
    status: input.status ?? "draft",
    proofreadStatus: input.proofreadStatus ?? "unchecked",
    assigneeUid: input.assigneeUid ?? "",
    roundId: input.roundId ?? "",
    playOrder: input.playOrder ?? null,
    order,
    deletedAt: null,
    deletedBy: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export function QuestionsProvider({ setId, children }: { setId: string; children: ReactNode }) {
  const { user } = useAuth();
  const [all, setAll] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const creating = useRef(false);
  const allRef = useRef<Question[]>([]);
  allRef.current = all;

  // セット単位で1回だけ購読する。タブを切り替えても読み直さない（2000問×タブ切替ごとの再読込を防ぐ）
  useEffect(() => {
    if (!setId) return;
    setLoading(true);
    const q = query(collection(db, "questionSets", setId, "questions"), orderBy("order", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setAll(snap.docs.map((d) => normalizeQuestion(d.id, d.data())));
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error("問題の読み込みに失敗しました", err);
        setError(err.code === "permission-denied" ? "権限がありません" : "問題の読み込みに失敗しました");
        setLoading(false);
      }
    );
    return unsub;
  }, [setId]);

  const derived = useMemo(() => {
    const live: Question[] = [];
    const trash: Question[] = [];
    const emptyLegacy: Question[] = [];
    const byId = new Map<string, Question>();
    for (const q of all) {
      byId.set(q.id, q);
      if (q.deletedAt) trash.push(q);
      else if (isEmptyQuestion(q)) emptyLegacy.push(q);
      else live.push(q);
    }
    trash.sort((a, b) => b.deletedAt! - a.deletedAt!);
    return { live, trash, emptyLegacy, byId };
  }, [all]);

  const col = useCallback((...p: string[]) => collection(db, "questionSets", setId, "questions", ...p), [setId]);
  const nameOfMe = () => user?.displayName || user?.email || "匿名";

  const createQuestion = useCallback(
    async (input: QuestionInput) => {
      if (!user) throw new Error("ログインが必要です");
      if (!(input.body ?? "").trim() && !(input.answer ?? "").trim()) {
        throw new Error("問題文か答えのどちらかを入力してください");
      }
      if (creating.current) throw new Error("保存中です");
      creating.current = true;
      try {
        // order は作成時刻。複数人が同時に追加しても採番が衝突しない（旧データの小さい連番より常に後ろ）
        const ref = doc(col());
        const batch = writeBatch(db);
        batch.set(ref, baseDoc(input, user.uid, nameOfMe(), Date.now()));
        await batch.commit();
        return ref.id;
      } finally {
        creating.current = false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, col]
  );

  const updateQuestion = useCallback(
    async (id: string, patch: QuestionInput, logs: HistoryLog[] = []) => {
      if (!user) throw new Error("ログインが必要です");
      const data: Record<string, unknown> = { ...patch, updatedAt: serverTimestamp() };
      if (patch.sources) data.sources = padSources(patch.sources);
      if (patch.genreId !== undefined) data.genre = patch.genreId;
      for (const k of Object.keys(data)) if (data[k] === undefined) delete data[k];
      const batch = writeBatch(db);
      batch.update(doc(col(), id), data);
      for (const l of logs) {
        batch.set(doc(col(id, "history")), {
          ...l, authorUid: user.uid, authorName: nameOfMe(), createdAt: serverTimestamp(),
        });
      }
      await batch.commit();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, col]
  );

  const softDelete = useCallback(
    async (id: string) => {
      if (!user) throw new Error("ログインが必要です");
      const b = writeBatch(db);
      b.update(doc(col(), id), { deletedAt: serverTimestamp(), deletedBy: user.uid, updatedAt: serverTimestamp() });
      await b.commit();
    },
    [user, col]
  );

  const restore = useCallback(
    async (id: string) => {
      const b = writeBatch(db);
      b.update(doc(col(), id), { deletedAt: null, deletedBy: "", updatedAt: serverTimestamp() });
      await b.commit();
    },
    [col]
  );

  const hardDelete = useCallback(
    async (ids: string[]) => {
      // サブコレクション（history/comments/revisions）はFirestoreの仕様で親削除では消えない。
      // 孤立ドキュメントは親が無いので一覧にも出ず、読み取り課金も発生しない。
      for (let i = 0; i < ids.length; i += 400) {
        const b = writeBatch(db);
        ids.slice(i, i + 400).forEach((id) => b.delete(doc(col(), id)));
        await b.commit();
      }
    },
    [col]
  );

  const setPlayOrders = useCallback(
    async (orders: { id: string; playOrder: number | null }[]) => {
      for (let i = 0; i < orders.length; i += 400) {
        const b = writeBatch(db);
        orders.slice(i, i + 400).forEach((o) =>
          b.update(doc(col(), o.id), { playOrder: o.playOrder, updatedAt: serverTimestamp() })
        );
        await b.commit();
      }
    },
    [col]
  );

  const importQuestions = useCallback(
    async (rows: QuestionInput[], onProgress?: (done: number) => void) => {
      if (!user) throw new Error("ログインが必要です");
      const base = Date.now();
      let done = 0;
      for (let i = 0; i < rows.length; i += 400) {
        const b = writeBatch(db);
        rows.slice(i, i + 400).forEach((r, j) => {
          b.set(doc(col()), baseDoc(r, user.uid, nameOfMe(), base + i + j));
        });
        await b.commit(); // チャンク単位で確定。途中で失敗しても確定済み分は onProgress の件数で分かる
        done += Math.min(400, rows.length - i);
        onProgress?.(done);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, col]
  );

  const findDuplicate = useCallback((body: string, excludeId?: string) => {
    const t = body.trim();
    if (!t) return null;
    return allRef.current.find((q) => !q.deletedAt && q.id !== excludeId && q.body.trim() === t) ?? null;
  }, []);

  const value: Store = {
    loading, error, all, ...derived,
    createQuestion, updateQuestion, softDelete, restore, hardDelete, setPlayOrders, importQuestions, findDuplicate,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useQuestionStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useQuestionStore must be used within QuestionsProvider");
  return v;
}
