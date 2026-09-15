"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Plus as PlusIcon,
  CheckCircle2,
  CircleDashed,
  XCircle,
  BadgeCheck,
  AlertTriangle,
  Lock,
  Trash2,
  History,
} from "lucide-react";
import { Question, HistoryEntry, Revision, Role, MAX_SOURCES } from "@/lib/types";
import {
  allowedStatusOptions,
  canDeleteQuestion,
  canEditProofreadStatus,
  canEditQuestion,
  statusLabel,
} from "@/lib/permissions";
import { CommentSection } from "./CommentSection";
import { HistoryPanel } from "./HistoryPanel";

interface Props {
  setId: string;
  question: Question;
  role: Role;
  uid: string | undefined;
  genres: string[];
  saveState: "idle" | "saving" | "saved" | "error";
  duplicateOf: Question | null;
  history: HistoryEntry[];
  revisions: Revision[];
  onChange: (patch: Partial<Question>) => void;
  onCreateNext: () => void;
  onNavigate: (direction: "prev" | "next") => void;
  onDelete: () => void;
  // 作問モードでの連続作成フロー用のナビゲーションボタンを表示するかどうか。
  // 一覧から個別に開いた編集（InlineQuestionEditor）では表示しない。
  showNavigation?: boolean;
  hasPrev?: boolean;
  hasNext?: boolean;
}

const statusStyle: Record<
  Question["status"],
  { className: string; icon: React.ReactNode }
> = {
  draft: { className: "bg-slate-100 text-slate-500", icon: <CircleDashed size={13} /> },
  completed: { className: "bg-sky-50 text-sky-600", icon: <CheckCircle2 size={13} /> },
  adopted: { className: "bg-emerald-50 text-emerald-600", icon: <CheckCircle2 size={13} /> },
  rejected: { className: "bg-rose-50 text-rose-500", icon: <XCircle size={13} /> },
};

const statusRing: Record<Question["status"], string> = {
  draft: "ring-slate-200",
  completed: "ring-sky-200",
  adopted: "ring-emerald-200",
  rejected: "ring-rose-200",
};

const inputBase =
  "w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm text-slate-700 placeholder:text-slate-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50 disabled:text-slate-400";
const labelBase = "mb-1 block text-xs text-slate-400";

export function QuestionCard({
  setId,
  question,
  role,
  uid,
  genres,
  saveState,
  duplicateOf,
  history,
  revisions,
  onChange,
  onCreateNext,
  onNavigate,
  onDelete,
  showNavigation = true,
  hasPrev = false,
  hasNext = false,
}: Props) {
  const [showDetail, setShowDetail] = useState(false);
  const [showRevisions, setShowRevisions] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const editable = canEditQuestion(role, question, uid);
  const deletable = canDeleteQuestion(role, question, uid);
  const proofreadEditable = canEditProofreadStatus(role);
  const statusOptions = allowedStatusOptions(role);

  useEffect(() => {
    if (editable) bodyRef.current?.focus();
  }, [question.id, editable]);

  const saveLabel =
    saveState === "saving"
      ? "保存中…"
      : saveState === "saved"
      ? "保存済み"
      : saveState === "error"
      ? "保存できませんでした。再試行してください"
      : "";

  function updateSource(index: number, value: string) {
    const next = [...question.sources];
    next[index] = value;
    onChange({ sources: next });
  }

  return (
    <motion.div
      key={question.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={`relative rounded-3xl border border-slate-100 bg-white p-5 shadow-card ring-1 transition ${statusRing[question.status]}`}
    >
      {saveState === "saving" && (
        <motion.span
          className="absolute -inset-px rounded-3xl ring-2 ring-brand-200"
          animate={{ opacity: [0.6, 0.15, 0.6] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        />
      )}

      <div className="mb-3 flex items-center justify-between">
        <span
          className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle[question.status].className}`}
        >
          {statusStyle[question.status].icon}
          {statusLabel[question.status]}
        </span>
        <div className="flex items-center gap-2">
          {!editable && (
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Lock size={12} />
              閲覧のみ
            </span>
          )}
          <span
            className={`text-xs ${saveState === "error" ? "text-rose-500" : "text-slate-400"}`}
          >
            {saveLabel}
          </span>
        </div>
      </div>

      <textarea
        ref={bodyRef}
        value={question.body}
        onChange={(e) => onChange({ body: e.target.value })}
        disabled={!editable}
        placeholder="問題文を入力"
        rows={2}
        className="mb-1 w-full resize-none rounded-xl border border-slate-200 p-3 text-base leading-relaxed text-slate-800 placeholder:text-slate-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50"
      />
      {duplicateOf && (
        <p className="mb-1 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700">
          <AlertTriangle size={13} />
          同じ問題文が既にあります（{duplicateOf.authorName || "作問者不明"}）
        </p>
      )}
      <p className="mb-2 text-right text-[11px] text-slate-300">
        {question.body.length}文字
      </p>
      <textarea
        value={question.answer}
        onChange={(e) => onChange({ answer: e.target.value })}
        disabled={!editable}
        placeholder="答え"
        rows={1}
        className="mb-3 w-full resize-none rounded-xl border border-brand-100 bg-brand-50/50 p-3 text-base font-medium text-brand-700 placeholder:text-brand-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50"
      />

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowDetail((v) => !v)}
          className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
        >
          {showDetail ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {showDetail ? "詳細を隠す" : "詳細を表示"}
        </button>
        {deletable && (
          <button
            type="button"
            onClick={onDelete}
            className="mb-1 flex items-center gap-1 text-xs text-slate-400 hover:text-rose-500"
          >
            <Trash2 size={13} />
            削除
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {showDetail && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-3 border-t border-slate-100 pt-4">
              <div>
                <label className={labelBase}>別解・表記揺れ（カンマ区切り）</label>
                <input
                  disabled={!editable}
                  value={question.altAnswers.join(", ")}
                  onChange={(e) =>
                    onChange({
                      altAnswers: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  className={inputBase}
                />
              </div>

              <div>
                <label className={`${labelBase} flex items-center gap-1`}>
                  <BadgeCheck size={12} />
                  正誤判定基準
                </label>
                <input
                  disabled={!editable}
                  value={question.judgingCriteria}
                  onChange={(e) => onChange({ judgingCriteria: e.target.value })}
                  placeholder="例：都道府県名まで正確に。「北海道」以外は不正解"
                  className={inputBase}
                />
              </div>

              <div>
                <label className={labelBase}>解説</label>
                <textarea
                  disabled={!editable}
                  value={question.explanation}
                  onChange={(e) => onChange({ explanation: e.target.value })}
                  rows={2}
                  className={`${inputBase} resize-none`}
                />
              </div>

              <div>
                <label className={labelBase}>出典（最大{MAX_SOURCES}件）</label>
                <div className="space-y-1.5">
                  {question.sources.map((src, i) => {
                    const isUrl = /^https?:\/\//.test(src.trim());
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          disabled={!editable}
                          value={src}
                          onChange={(e) => updateSource(i, e.target.value)}
                          placeholder={`出典${i + 1}`}
                          className={inputBase}
                        />
                        {isUrl && (
                          <a
                            href={src}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0 text-xs text-brand-600 underline"
                          >
                            開く
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className={labelBase}>ジャンル</label>
                <select
                  disabled={!editable}
                  value={question.genre}
                  onChange={(e) => onChange({ genre: e.target.value })}
                  className={inputBase}
                >
                  <option value="">未設定</option>
                  {genres.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelBase}>タグ（カンマ区切り）</label>
                <input
                  disabled={!editable}
                  value={question.tags.join(", ")}
                  onChange={(e) =>
                    onChange({
                      tags: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  className={inputBase}
                />
              </div>

              <div>
                <label className={labelBase}>備考</label>
                <textarea
                  disabled={!editable}
                  value={question.memo}
                  onChange={(e) => onChange({ memo: e.target.value })}
                  rows={2}
                  placeholder="作問者向けのメモ"
                  className={`${inputBase} resize-none`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelBase}>ステータス</label>
                  <select
                    disabled={!editable || statusOptions.length === 0}
                    value={question.status}
                    onChange={(e) =>
                      onChange({ status: e.target.value as Question["status"] })
                    }
                    className={inputBase}
                  >
                    {statusOptions.length === 0 && (
                      <option value={question.status}>{statusLabel[question.status]}</option>
                    )}
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>{statusLabel[s]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelBase}>校正状態</label>
                  <select
                    disabled={!proofreadEditable}
                    value={question.proofreadStatus}
                    onChange={(e) =>
                      onChange({
                        proofreadStatus: e.target
                          .value as Question["proofreadStatus"],
                      })
                    }
                    className={inputBase}
                  >
                    <option value="unchecked">未確認</option>
                    <option value="in_review">校正中</option>
                    <option value="needs_fix">要修正</option>
                    <option value="approved">承認済み</option>
                    <option value="on_hold">保留</option>
                  </select>
                </div>
              </div>

              <CommentSection setId={setId} questionId={question.id} />
              <HistoryPanel entries={history} />

              {revisions.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowRevisions((v) => !v)}
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-600"
                  >
                    <History size={13} />
                    改訂履歴（{revisions.length}）
                  </button>
                  {showRevisions && (
                    <div className="mt-2 space-y-2">
                      {revisions.map((r) => (
                        <div key={r.id} className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-500">
                          <p className="mb-1 text-slate-400">{r.editedByName}が改訂</p>
                          <p className="text-slate-600">{r.body}</p>
                          <p className="text-brand-600">{r.answer}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showNavigation && editable && (
        <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => onNavigate("prev")}
            disabled={!hasPrev}
            className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:border-brand-300 hover:text-brand-600 disabled:opacity-30"
          >
            <ChevronLeftIcon size={16} />
            前へ
          </button>
          <button
            type="button"
            onClick={() => onNavigate("next")}
            disabled={!hasNext}
            className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:border-brand-300 hover:text-brand-600 disabled:opacity-30"
          >
            次へ
            <ChevronRightIcon size={16} />
          </button>
          <button
            type="button"
            onClick={onCreateNext}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
          >
            <PlusIcon size={16} />
            次の問題を作成
          </button>
        </div>
      )}
    </motion.div>
  );
}
