"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, BadgeCheck, AlertTriangle } from "lucide-react";
import { Question, HistoryEntry } from "@/lib/types";
import { CommentSection } from "./CommentSection";
import { HistoryPanel } from "./HistoryPanel";

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

// 採点スタンプ：意思決定（採用/不採用）のときだけ紙に押す。
// 下書きは無印のまま（何も押されていない紙、という状態そのものが情報）。
const stamp: Record<Question["status"], { label: string; className: string } | null> = {
  draft: null,
  adopted: { label: "採用", className: "text-stamp" },
  rejected: { label: "不採用", className: "text-ink-soft" },
};

const inputBase =
  "w-full rounded-md border border-kraft-line bg-card p-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none";
const labelBase = "mb-1 block text-xs text-ink-soft";

// 作問モードのメインカード（インデックスカードのメタファー）。
// - contenteditableではなくtextareaを使う（日本語IME変換中の
//   カーソル制御・変換破壊を避けるため）。
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
  const activeStamp = stamp[question.status];

  return (
    <div
      onKeyDown={handleKeyDown}
      className="relative overflow-hidden rounded-lg border border-kraft-dark bg-card px-6 pb-5 pt-8 shadow-[0_1px_0_#e7dcc3,0_8px_20px_-12px_rgba(32,42,59,0.25)]"
    >
      <span className="punch-holes">
        <span />
        <span />
      </span>

      {activeStamp && <span className={`stamp ${activeStamp.className}`}>{activeStamp.label}</span>}

      <div className="mb-3 flex items-center justify-between">
        <span className="font-mincho text-sm tracking-wide text-ink-soft">
          作問カード
        </span>
        <span
          className={`text-xs ${
            saveState === "error" ? "text-stamp" : "text-ink-faint"
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
        rows={3}
        className="ruled-paper mb-1 w-full resize-none rounded-md border border-kraft-line bg-card p-3 text-base leading-7 text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none"
      />
      {duplicateOf && (
        <p className="mb-1 flex items-center gap-1.5 rounded-md border border-kraft-dark bg-kraft/40 px-2.5 py-1.5 text-xs text-ink-soft">
          <AlertTriangle size={13} />
          同じ問題文が既にあります（{duplicateOf.authorName || "作問者不明"}）
        </p>
      )}
      <p className="mb-2 text-right text-[11px] text-ink-faint">
        {question.body.length}文字
      </p>
      <textarea
        value={question.answer}
        onChange={(e) => onChange({ answer: e.target.value })}
        placeholder="答え"
        rows={1}
        className="mb-3 w-full resize-none rounded-md border border-kraft-dark bg-moss-soft p-3 text-base font-medium text-ink focus:border-ink focus:outline-none"
      />

      <button
        type="button"
        onClick={() => setShowDetail((v) => !v)}
        className="mb-1 flex items-center gap-1 text-xs font-medium text-ink-soft hover:text-ink"
      >
        {showDetail ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {showDetail ? "詳細を隠す" : "詳細を表示"}
      </button>

      {showDetail && (
        <div className="mt-2 space-y-3 border-t border-dashed border-kraft-dark pt-4">
          <div>
            <label className={labelBase}>別解・表記揺れ（カンマ区切り）</label>
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
              className={inputBase}
            />
          </div>

          <div>
            <label className={`${labelBase} flex items-center gap-1`}>
              <BadgeCheck size={12} />
              正誤判定基準
            </label>
            <input
              value={question.judgingCriteria}
              onChange={(e) => onChange({ judgingCriteria: e.target.value })}
              placeholder="例：都道府県名まで正確に。「北海道」以外は不正解"
              className={inputBase}
            />
          </div>

          <div>
            <label className={labelBase}>解説</label>
            <textarea
              value={question.explanation}
              onChange={(e) => onChange({ explanation: e.target.value })}
              rows={2}
              className={`${inputBase} resize-none`}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelBase}>出典{isUrl && "（リンク）"}</label>
              <input
                value={question.source}
                onChange={(e) => onChange({ source: e.target.value })}
                placeholder="書籍名・URLなど"
                className={inputBase}
              />
              {isUrl && (
                <a
                  href={question.source}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-xs text-ink underline"
                >
                  リンクを開く
                </a>
              )}
            </div>
            <div>
              <label className={labelBase}>ジャンル</label>
              <input
                value={question.genre}
                onChange={(e) => onChange({ genre: e.target.value })}
                placeholder="例：地理"
                className={inputBase}
              />
            </div>
          </div>

          <div>
            <label className={labelBase}>タグ（カンマ区切り）</label>
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
              className={inputBase}
            />
          </div>

          <div>
            <label className={labelBase}>備考</label>
            <textarea
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
                value={question.status}
                onChange={(e) =>
                  onChange({ status: e.target.value as Question["status"] })
                }
                className={inputBase}
              >
                <option value="draft">下書き</option>
                <option value="adopted">採用</option>
                <option value="rejected">不採用</option>
              </select>
            </div>
            <div>
              <label className={labelBase}>校正状態</label>
              <select
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
        </div>
      )}

      <p className="mt-4 text-xs text-ink-faint">
        <kbd className="rounded border border-kraft-line px-1">⌘/Ctrl</kbd>+
        <kbd className="rounded border border-kraft-line px-1">Enter</kbd>{" "}
        で保存して次の問題へ ・
        <kbd className="rounded border border-kraft-line px-1">⌘/Ctrl</kbd>+
        <kbd className="rounded border border-kraft-line px-1">D</kbd> で詳細表示切替
      </p>
    </div>
  );
}
