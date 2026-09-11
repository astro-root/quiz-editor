"use client";

import { useEffect, useRef, useState } from "react";
import { Question } from "@/lib/types";

interface Props {
  question: Question;
  saveState: "idle" | "saving" | "saved" | "error";
  onChange: (patch: Partial<Question>) => void;
  onCreateNext: () => void;
  onNavigate: (direction: "prev" | "next") => void;
}

// 作問モードのメインカード。
// - contenteditableではなくtextareaを使う（日本語IME変換中の
//   カーソル制御・変換破壊を避けるため。要件で明示されている通り、
//   IMEとの相性を最優先してcontenteditableを避ける判断をした）。
// - Cmd/Ctrl+Enterで保存して次の問題へ、Cmd/Ctrl+D で詳細開閉、
//   Cmd/Ctrl+矢印で前後の問題へ移動、Escで編集中断（フォーカスを外す）。
export function QuestionCard({
  question,
  saveState,
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

  return (
    <div
      onKeyDown={handleKeyDown}
      className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      <div className="mb-2 flex items-center justify-between text-xs text-gray-400">
        <span>編集中</span>
        <span
          className={saveState === "error" ? "text-red-500" : "text-gray-400"}
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
        className="mb-2 w-full resize-none rounded-lg border border-gray-200 p-2 text-base leading-relaxed focus:border-blue-400 focus:outline-none"
      />
      <textarea
        value={question.answer}
        onChange={(e) => onChange({ answer: e.target.value })}
        placeholder="答え"
        rows={1}
        className="mb-2 w-full resize-none rounded-lg border border-gray-200 p-2 text-base font-medium text-blue-700 focus:border-blue-400 focus:outline-none"
      />

      <button
        type="button"
        onClick={() => setShowDetail((v) => !v)}
        className="mb-1 text-xs text-gray-500 hover:text-gray-700"
      >
        {showDetail ? "詳細を隠す" : "詳細を表示"}
      </button>

      {showDetail && (
        <div className="mt-2 space-y-2 border-t border-gray-100 pt-3">
          <div>
            <label className="mb-1 block text-xs text-gray-400">
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
              className="w-full rounded-lg border border-gray-200 p-2 text-sm focus:border-blue-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">解説</label>
            <textarea
              value={question.explanation}
              onChange={(e) => onChange({ explanation: e.target.value })}
              rows={2}
              className="w-full resize-none rounded-lg border border-gray-200 p-2 text-sm focus:border-blue-400 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-gray-400">出典</label>
              <input
                value={question.source}
                onChange={(e) => onChange({ source: e.target.value })}
                className="w-full rounded-lg border border-gray-200 p-2 text-sm focus:border-blue-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">
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
                className="w-full rounded-lg border border-gray-200 p-2 text-sm focus:border-blue-400 focus:outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-gray-400">
                ステータス
              </label>
              <select
                value={question.status}
                onChange={(e) =>
                  onChange({ status: e.target.value as Question["status"] })
                }
                className="w-full rounded-lg border border-gray-200 p-2 text-sm"
              >
                <option value="draft">下書き</option>
                <option value="adopted">採用</option>
                <option value="rejected">不採用</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">
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
                className="w-full rounded-lg border border-gray-200 p-2 text-sm"
              >
                <option value="unchecked">未確認</option>
                <option value="checked">確認済み</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <p className="mt-3 text-xs text-gray-400">
        <kbd className="rounded border border-gray-300 px-1">⌘/Ctrl</kbd>+
        <kbd className="rounded border border-gray-300 px-1">Enter</kbd>{" "}
        で保存して次の問題へ ・
        <kbd className="rounded border border-gray-300 px-1">⌘/Ctrl</kbd>+
        <kbd className="rounded border border-gray-300 px-1">D</kbd> で詳細表示切替
      </p>
    </div>
  );
}
