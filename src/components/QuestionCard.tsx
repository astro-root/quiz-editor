"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  CircleDashed,
  XCircle,
  BadgeCheck,
} from "lucide-react";
import { Question, HistoryEntry } from "@/lib/types";
import { CommentSection } from "./CommentSection";
import { HistoryPanel } from "./HistoryPanel";
import { AlertTriangle } from "lucide-react";

interface Props {
  setId: string;
  question: Question;
  saveState: "idle" | "saving" | "saved" | "error";
  duplicateOf: Question | null;
  history: HistoryEntry[];
  onChange: (patch: Partial<Question>) => void;
  onCreateNext: () => void;
  onNavigate: (direction: "prev" | "next") => void;
}

const statusStyle: Record<
  Question["status"],
  { label: string; className: string; icon: React.ReactNode }
> = {
  draft: {
    label: "下書き",
    className: "bg-slate-100 text-slate-500",
    icon: <CircleDashed size={13} />,
  },
  adopted: {
    label: "採用",
    className: "bg-emerald-50 text-emerald-600",
    icon: <CheckCircle2 size={13} />,
  },
  rejected: {
    label: "不採用",
    className: "bg-red-50 text-red-500",
    icon: <XCircle size={13} />,
  },
};

const statusBorder: Record<Question["status"], string> = {
  draft: "border-l-slate-300",
  adopted: "border-l-emerald-400",
  rejected: "border-l-red-300",
};

// 作問モードのメインカード。
// - contenteditableではなくtextareaを使う（日本語IME変換中の
//   カーソル制御・変換破壊を避けるため。要件で明示されている通り、
//   IMEとの相性を最優先してcontenteditableを避ける判断をした）。
// - Cmd/Ctrl+Enterで保存して次の問題へ、Cmd/Ctrl+D で詳細開閉、
//   Cmd/Ctrl+矢印で前後の問題へ移動、Escで編集中断（フォーカスを外す）。
export function QuestionCard({
  setId,
  question,
  saveState,
  duplicateOf,
  history,
  onChange,
  onCreateNext,
  onNavigate,
}: Props) {
  const [showDetail, setShowDetail] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bodyRef.current?.focus();
  }, [question.id]);

  function handleKeyDown(e: React.KeyboardEvent) {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key === "Enter") {
      e.preventDefault();
      onCreateNext();
    } else if (mod && e.key.toLowerCase() === "d") {
      e.preventDefault();
      setShowDetail((v) => !v);
    } else if (mod && e.key === "ArrowUp") {
      e.preventDefault();
      onNavigate("prev");
    } else if (mod && e.key === "ArrowDown") {
      e.preventDefault();
      onNavigate("next");
    } else if (e.key === "Escape") {
      (e.target as HTMLElement).blur();
    }
  }

  const saveLabel =
    saveState === "saving"
      ? "保存中…"
      : saveState === "saved"
      ? "保存済み"
      : saveState === "error"
      ? "保存できませんでした。再試行してください"
      : "";

  const isUrl = /^https?:\/\//.test(question.source.trim());

  return (
    <div
      onKeyDown={handleKeyDown}
      className={`rounded-2xl border border-l-4 border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-900/5 transition ${statusBorder[question.status]}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <span
          className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle[question.status].className}`}
        >
          {statusStyle[question.status].icon}
          {statusStyle[question.status].label}
        </span>
        <span
          className={`text-xs ${
            saveState === "error" ? "text-red-500" : "text-slate-400"
          }`}
        >
          {saveLabel}
        </span>
      </div>

      <textarea
        ref={bodyRef}
        value={question.body}
        onChange={(e) => onChange({ body: e.target.value })}
        placeholder="問題文を入力"
        rows={2}
        className="mb-1 w-full resize-none rounded-xl border border-slate-200 p-3 text-base leading-relaxed focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
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
        placeholder="答え"
        rows={1}
        className="mb-3 w-full resize-none rounded-xl border border-slate-200 bg-blue-50/40 p-3 text-base font-medium text-blue-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
      />

      <button
        type="button"
        onClick={() => setShowDetail((v) => !v)}
        className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
      >
        {showDetail ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {showDetail ? "詳細を隠す" : "詳細を表示"}
      </button>

      {showDetail && (
        <div className="mt-2 space-y-3 border-t border-slate-100 pt-4">
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              別解・表記揺れ（カンマ区切り）
            </label>
            <input
              value={question.altAnswers.join(", ")}
              onChange={(e) =>
                onChange({
                  altAnswers: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              className="w-full rounded-lg border border-slate-200 p-2 text-sm focus:border-blue-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1 text-xs text-slate-400">
              <BadgeCheck size={12} />
              正誤判定基準
            </label>
            <input
              value={question.judgingCriteria}
              onChange={(e) => onChange({ judgingCriteria: e.target.value })}
              placeholder="例：都道府県名まで正確に。「北海道」以外は不正解"
              className="w-full rounded-lg border border-slate-200 p-2 text-sm focus:border-blue-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-400">解説</label>
            <textarea
              value={question.explanation}
              onChange={(e) => onChange({ explanation: e.target.value })}
              rows={2}
              className="w-full resize-none rounded-lg border border-slate-200 p-2 text-sm focus:border-blue-400 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                出典{isUrl && "（リンク）"}
              </label>
              <input
                value={question.source}
                onChange={(e) => onChange({ source: e.target.value })}
                placeholder="書籍名・URLなど"
                className="w-full rounded-lg border border-slate-200 p-2 text-sm focus:border-blue-400 focus:outline-none"
              />
              {isUrl && (
                <a
                  href={question.source}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-xs text-blue-500 underline"
                >
                  リンクを開く
                </a>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                ジャンル
              </label>
              <input
                value={question.genre}
                onChange={(e) => onChange({ genre: e.target.value })}
                placeholder="例：地理"
                className="w-full rounded-lg border border-slate-200 p-2 text-sm focus:border-blue-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-400">
              タグ（カンマ区切り）
            </label>
            <input
              value={question.tags.join(", ")}
              onChange={(e) =>
                onChange({
                  tags: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              className="w-full rounded-lg border border-slate-200 p-2 text-sm focus:border-blue-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-400">備考</label>
            <textarea
              value={question.memo}
              onChange={(e) => onChange({ memo: e.target.value })}
              rows={2}
              placeholder="作問者向けのメモ"
              className="w-full resize-none rounded-lg border border-slate-200 p-2 text-sm focus:border-blue-400 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                ステータス
              </label>
              <select
                value={question.status}
                onChange={(e) =>
                  onChange({ status: e.target.value as Question["status"] })
                }
                className="w-full rounded-lg border border-slate-200 p-2 text-sm"
              >
                <option value="draft">下書き</option>
                <option value="adopted">採用</option>
                <option value="rejected">不採用</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                校正状態
              </label>
              <select
                value={question.proofreadStatus}
                onChange={(e) =>
                  onChange({
                    proofreadStatus: e.target
                      .value as Question["proofreadStatus"],
                  })
                }
                className="w-full rounded-lg border border-slate-200 p-2 text-sm"
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
        </div>
      )}

      <p className="mt-3 text-xs text-slate-300">
        <kbd className="rounded border border-slate-200 px-1">⌘/Ctrl</kbd>+
        <kbd className="rounded border border-slate-200 px-1">Enter</kbd>{" "}
        で保存して次の問題へ ・
        <kbd className="rounded border border-slate-200 px-1">⌘/Ctrl</kbd>+
        <kbd className="rounded border border-slate-200 px-1">D</kbd> で詳細表示切替
      </p>
    </div>
  );
}
