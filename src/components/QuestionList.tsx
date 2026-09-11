"use client";

import { useMemo, useState } from "react";
import { Question } from "@/lib/types";

interface Props {
  questions: Question[];
}

const statusLabel: Record<Question["status"], string> = {
  draft: "下書き",
  adopted: "採用",
  rejected: "不採用",
};

const proofreadLabel: Record<Question["proofreadStatus"], string> = {
  unchecked: "未確認",
  checked: "確認済み",
};

// 管理モード：俯瞰・整理用の簡易一覧。
// 表計算ソフトのグリッドではなく、フィルタ付きのリスト表示にとどめる
// （表形式ビューはMVPでは実装しない）。
export function QuestionList({ questions }: Props) {
  const [authorFilter, setAuthorFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [proofreadFilter, setProofreadFilter] = useState("all");

  const authors = useMemo(
    () => Array.from(new Set(questions.map((q) => q.authorName).filter(Boolean))),
    [questions]
  );
  const tags = useMemo(
    () => Array.from(new Set(questions.flatMap((q) => q.tags))),
    [questions]
  );

  const filtered = questions.filter((q) => {
    if (authorFilter !== "all" && q.authorName !== authorFilter) return false;
    if (tagFilter !== "all" && !q.tags.includes(tagFilter)) return false;
    if (statusFilter !== "all" && q.status !== statusFilter) return false;
    if (proofreadFilter !== "all" && q.proofreadStatus !== proofreadFilter)
      return false;
    return true;
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={authorFilter}
          onChange={(e) => setAuthorFilter(e.target.value)}
          className="rounded-lg border border-gray-200 p-2 text-sm"
        >
          <option value="all">作問者：すべて</option>
          {authors.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="rounded-lg border border-gray-200 p-2 text-sm"
        >
          <option value="all">タグ：すべて</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-200 p-2 text-sm"
        >
          <option value="all">ステータス：すべて</option>
          <option value="draft">下書き</option>
          <option value="adopted">採用</option>
          <option value="rejected">不採用</option>
        </select>
        <select
          value={proofreadFilter}
          onChange={(e) => setProofreadFilter(e.target.value)}
          className="rounded-lg border border-gray-200 p-2 text-sm"
        >
          <option value="all">校正：すべて</option>
          <option value="unchecked">未確認</option>
          <option value="checked">確認済み</option>
        </select>
      </div>

      <div className="space-y-2">
        {filtered.map((q, i) => (
          <div
            key={q.id}
            className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 p-3 text-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-xs text-gray-400">
                Q{String(i + 1).padStart(3, "0")}
              </p>
              <p className="truncate">{q.body || "（未入力）"}</p>
              <p className="truncate text-blue-700">{q.answer || "（未入力）"}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-gray-500">
              <span>{q.authorName || "―"}</span>
              <span className="flex gap-1">
                {q.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-600"
                  >
                    {t}
                  </span>
                ))}
              </span>
              <span>{statusLabel[q.status]}</span>
              <span>{proofreadLabel[q.proofreadStatus]}</span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="p-4 text-center text-sm text-gray-400">
            条件に合う問題がありません
          </p>
        )}
      </div>
    </div>
  );
}
