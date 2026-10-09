"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ExternalLink, History, Trash2, Lock, Loader2 } from "lucide-react";
import { MAX_SOURCES, ProofreadStatus, Question } from "@/lib/types";
import {
  allowedStatusOptions, canDeleteQuestion, canEditQuestion, canJudge, canProofread,
  proofreadLabel, shouldLogRevision, statusLabel,
} from "@/lib/permissions";
import { useAuth } from "@/lib/auth-context";
import { useSetContext } from "@/lib/SetContext";
import { HistoryLog, useQuestionStore } from "@/lib/QuestionsContext";
import { useHistory } from "@/lib/useHistory";
import { useRevisions } from "@/lib/useRevisions";
import { CommentSection } from "./CommentSection";
import { HistoryPanel } from "./HistoryPanel";

const input =
  "w-full rounded-lg border border-slate-200 bg-white p-2 text-base text-slate-700 placeholder:text-slate-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50 disabled:text-slate-400";
const label = "mb-1 block text-xs text-slate-400";

type Draft = Omit<Question, "id" | "createdAt" | "updatedAt" | "order" | "deletedAt" | "deletedBy" | "authorUid" | "authorName" | "playOrder">;

function toDraft(q: Question): Draft {
  return {
    body: q.body, answer: q.answer, altAnswers: q.altAnswers, judgingCriteria: q.judgingCriteria,
    genreId: q.genreId, subGenreId: q.subGenreId, explanation: q.explanation, sources: q.sources, memo: q.memo,
    tags: q.tags, status: q.status, proofreadStatus: q.proofreadStatus, assigneeUid: q.assigneeUid, roundId: q.roundId,
  };
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// 一覧の中でその場に展開されるエディタ。明示的な［保存］［キャンセル］で確定する
// （打鍵ごとの自動保存はしない＝書き込み回数と、他人の更新との競合を減らす）。
export function QuestionEditor({ question, onClose }: { question: Question; onClose: () => void }) {
  const { user } = useAuth();
  const { set, role, tree, gi, personOf } = useSetContext();
  const store = useQuestionStore();
  const uid = user?.uid;

  const base = useRef(question); // 開いた時点の内容
  const [draft, setDraft] = useState<Draft>(() => toDraft(question));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showLog, setShowLog] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const canEdit = canEditQuestion(role, question, uid);
  const canDel = canDeleteQuestion(role, question, uid);
  const judge = canJudge(role);
  const proof = canProofread(role, question, uid);
  const statusOptions = allowedStatusOptions(role);

  useEffect(() => {
    bodyRef.current?.focus({ preventScroll: true }); // 展開でスクロールが飛ばないようにする
  }, []);

  const dirty = useMemo(() => {
    const b = toDraft(base.current);
    return (Object.keys(draft) as (keyof Draft)[]).some((k) => !same(draft[k], b[k]));
  }, [draft]);
  // 自分が編集中に他の人が同じ問題を更新した場合に知らせる
  const remoteChanged = question.updatedAt !== base.current.updatedAt && dirty;

  const dup = store.findDuplicate(draft.body, question.id);
  const subs = gi.subsOf(draft.genreId);

  function set_<K extends keyof Draft>(k: K, v: Draft[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
  }

  async function handleSave() {
    setError("");
    const b = toDraft(base.current);
    const patch: Partial<Draft> = {};
    (Object.keys(draft) as (keyof Draft)[]).forEach((k) => {
      if (!same(draft[k], b[k])) (patch as any)[k] = draft[k];
    });
    if (Object.keys(patch).length === 0) return onClose();
    const nextBody = (patch.body ?? b.body).trim();
    const nextAnswer = (patch.answer ?? b.answer).trim();
    if (!nextBody && !nextAnswer) return setError("問題文か答えのどちらかは必須です（空にする場合は削除してください）");
    if (patch.body !== undefined) patch.body = patch.body.trim();
    if (patch.answer !== undefined) patch.answer = patch.answer.trim();
    if (patch.genreId !== undefined && patch.subGenreId === undefined && !gi.subsOf(patch.genreId).some((s) => s.id === draft.subGenreId)) {
      patch.subGenreId = "";
    }

    const logs: HistoryLog[] = [];
    if (patch.status && patch.status !== b.status) logs.push({ field: "status", from: b.status, to: patch.status });
    if (patch.proofreadStatus && patch.proofreadStatus !== b.proofreadStatus)
      logs.push({ field: "proofreadStatus", from: b.proofreadStatus, to: patch.proofreadStatus });
    if (patch.assigneeUid !== undefined)
      logs.push({ field: "assignee", from: b.assigneeUid ? personOf(b.assigneeUid).name : "", to: patch.assigneeUid ? personOf(patch.assigneeUid).name : "" });
    if (patch.roundId !== undefined)
      logs.push({ field: "round", from: set.rounds.find((r) => r.id === b.roundId)?.name ?? "", to: set.rounds.find((r) => r.id === patch.roundId)?.name ?? "" });

    setSaving(true);
    try {
      // 問題統括・管理者による本文/答えの変更は、変更前を改訂履歴に残す
      if ((patch.body !== undefined || patch.answer !== undefined) && shouldLogRevision(role) && user) {
        await saveRevisionOnce(set.id, question.id, base.current.body, base.current.answer, user.uid, user.displayName || user.email || "匿名");
      }
      await store.updateQuestion(question.id, patch, logs);
      onClose();
    } catch (e: any) {
      console.error("問題の保存に失敗しました", e);
      setError(e?.code === "permission-denied" ? "この操作の権限がありません" : "保存に失敗しました。通信状況を確認して再試行してください");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (dirty && !confirm("編集内容を破棄しますか？")) return;
    onClose();
  }

  async function handleDelete() {
    if (!confirm("この問題をゴミ箱に移動しますか？（ゴミ箱から復元できます）")) return;
    try {
      await store.softDelete(question.id);
      onClose();
    } catch (e) {
      console.error(e);
      setError("削除に失敗しました");
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (!saving) handleSave();
    }
  }

  const members = Object.keys(set.members);
  const proofOptions: ProofreadStatus[] = ["unchecked", "in_review", "approved", "needs_fix", "on_hold"];

  return (
    <div onKeyDown={onKeyDown} className="rounded-2xl border-2 border-brand-200 bg-white p-4 shadow-pop" role="group" aria-label="問題の編集">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-brand-600">問題を編集</span>
        {!canEdit && <span className="flex items-center gap-1 text-xs text-slate-400"><Lock size={12} />内容は閲覧のみ</span>}
      </div>

      {remoteChanged && (
        <p className="mb-2 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700">
          <AlertTriangle size={13} />編集中に他の人がこの問題を更新しました。保存すると、あなたが変更した項目だけが上書きされます。
        </p>
      )}

      <label className={label}>問題文</label>
      <textarea ref={bodyRef} value={draft.body} onChange={(e) => set_("body", e.target.value)} disabled={!canEdit} rows={3} className={`${input} mb-1 resize-y leading-relaxed`} />
      {dup && (
        <p className="mb-1 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700">
          <AlertTriangle size={13} />同じ問題文が既にあります（{personOf(dup.authorUid, dup.authorName).name}）
        </p>
      )}
      <p className="mb-2 text-right text-[11px] text-slate-300">{draft.body.length}文字</p>

      <label className={label}>解答</label>
      <textarea value={draft.answer} onChange={(e) => set_("answer", e.target.value)} disabled={!canEdit} rows={1} className={`${input} mb-3 resize-y font-medium text-brand-700`} />

      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={label}>別解・表記揺れ（カンマ区切り）</label>
          <input disabled={!canEdit} value={draft.altAnswers.join(", ")} onChange={(e) => set_("altAnswers", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} className={input} />
        </div>
        <div>
          <label className={label}>正誤判定基準</label>
          <input disabled={!canEdit} value={draft.judgingCriteria} onChange={(e) => set_("judgingCriteria", e.target.value)} className={input} />
        </div>
      </div>

      <label className={label}>解説</label>
      <textarea disabled={!canEdit} value={draft.explanation} onChange={(e) => set_("explanation", e.target.value)} rows={2} className={`${input} mb-3 resize-y`} />

      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={label}>大ジャンル</label>
          <select disabled={!canEdit} value={draft.genreId} onChange={(e) => setDraft((d) => ({ ...d, genreId: e.target.value, subGenreId: "" }))} className={input}>
            <option value="">未設定</option>
            {tree.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            {draft.genreId && !tree.some((g) => g.id === draft.genreId) && <option value={draft.genreId}>{gi.majorName(draft.genreId)}</option>}
          </select>
        </div>
        <div>
          <label className={label}>小ジャンル</label>
          <select disabled={!canEdit || !draft.genreId} value={draft.subGenreId} onChange={(e) => set_("subGenreId", e.target.value)} className={input}>
            <option value="">未設定</option>
            {subs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            {draft.subGenreId && !subs.some((s) => s.id === draft.subGenreId) && <option value={draft.subGenreId}>（削除済み）</option>}
          </select>
        </div>
      </div>

      <div className="mb-3">
        <label className={label}>出典（最大{MAX_SOURCES}件）</label>
        <div className="space-y-1.5">
          {draft.sources.map((src, i) => {
            const isUrl = /^https?:\/\//.test(src.trim());
            return (
              <div key={i} className="flex items-center gap-2">
                <input
                  disabled={!(canEdit || proof)}
                  value={src}
                  onChange={(e) => { const n = [...draft.sources]; n[i] = e.target.value; set_("sources", n); }}
                  placeholder={`出典${i + 1}（URLなど）`}
                  className={input}
                />
                {isUrl && (
                  <a href={src.trim()} target="_blank" rel="noopener noreferrer" className="flex shrink-0 items-center gap-0.5 text-xs text-brand-600 underline">
                    開く<ExternalLink size={11} />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={label}>タグ（カンマ区切り）</label>
          <input disabled={!canEdit} value={draft.tags.join(", ")} onChange={(e) => set_("tags", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} className={input} />
        </div>
        <div>
          <label className={label}>備考</label>
          <input disabled={!canEdit} value={draft.memo} onChange={(e) => set_("memo", e.target.value)} className={input} />
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-4">
        <div>
          <label className={label}>採用状態</label>
          <select disabled={statusOptions.length === 0 || (!judge && (draft.status === "adopted" || draft.status === "rejected"))} value={draft.status} onChange={(e) => set_("status", e.target.value as Question["status"])} className={input}>
            {!statusOptions.includes(draft.status) && <option value={draft.status}>{statusLabel[draft.status]}</option>}
            {statusOptions.map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Round</label>
          <select disabled={!judge} value={draft.roundId} onChange={(e) => set_("roundId", e.target.value)} className={input}>
            <option value="">未指定</option>
            {set.rounds.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            {draft.roundId && !set.rounds.some((r) => r.id === draft.roundId) && <option value={draft.roundId}>（削除済み）</option>}
          </select>
        </div>
        <div>
          <label className={label}>裏どり担当</label>
          <select disabled={!judge} value={draft.assigneeUid} onChange={(e) => set_("assigneeUid", e.target.value)} className={input}>
            <option value="">未割り当て</option>
            {members.map((m) => <option key={m} value={m}>{personOf(m).name}</option>)}
            {draft.assigneeUid && !set.members[draft.assigneeUid] && <option value={draft.assigneeUid}>退出したユーザー</option>}
          </select>
        </div>
        <div>
          <label className={label}>裏どり状態</label>
          <select disabled={!proof} value={draft.proofreadStatus} onChange={(e) => set_("proofreadStatus", e.target.value as ProofreadStatus)} className={input}>
            {proofOptions.map((s) => <option key={s} value={s}>{proofreadLabel[s]}</option>)}
          </select>
        </div>
      </div>

      {error && <p role="alert" className="mb-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={handleSave} disabled={saving || !dirty} className="flex min-h-[40px] items-center gap-1.5 rounded-lg bg-brand-600 px-5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40">
          {saving && <Loader2 size={14} className="animate-spin" />}保存
        </button>
        <button onClick={handleCancel} disabled={saving} className="min-h-[40px] rounded-lg border border-slate-200 px-4 text-sm text-slate-600 hover:bg-slate-50">
          キャンセル
        </button>
        <span className="hidden text-[11px] text-slate-300 sm:inline">Ctrl/⌘+Enterで保存</span>
        <button onClick={() => setShowLog((v) => !v)} className="ml-auto flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600">
          <History size={13} />履歴・コメント
        </button>
        {canDel && (
          <button onClick={handleDelete} className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-500">
            <Trash2 size={13} />削除
          </button>
        )}
      </div>

      {showLog && <LogArea setId={set.id} questionId={question.id} />}
    </div>
  );
}

// 同じ問題を1回の編集で何度も保存しても改訂履歴が増えすぎないよう、保存前の内容を1件だけ記録する
async function saveRevisionOnce(setId: string, qid: string, body: string, answer: string, uid: string, name: string) {
  const { addDoc, collection, serverTimestamp } = await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");
  await addDoc(collection(db, "questionSets", setId, "questions", qid, "revisions"), {
    body, answer, editedByUid: uid, editedByName: name, createdAt: serverTimestamp(),
  });
}

// 履歴・コメントは開いたときだけ購読する（一覧の全行で購読すると読み取りが膨らむ）
function LogArea({ setId, questionId }: { setId: string; questionId: string }) {
  const { history } = useHistory(setId, questionId);
  const { revisions } = useRevisions(setId, questionId);
  return (
    <div className="mt-3">
      <CommentSection setId={setId} questionId={questionId} />
      <HistoryPanel entries={history} />
      {revisions.length > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="mb-1 text-xs font-medium text-slate-400">改訂履歴（{revisions.length}）</p>
          <div className="max-h-40 space-y-2 overflow-y-auto">
            {revisions.map((r) => (
              <div key={r.id} className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-500">
                <p className="mb-1 text-slate-400">{r.editedByName}が改訂（変更前）</p>
                <p className="text-slate-600">{r.body}</p>
                <p className="text-brand-600">{r.answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
