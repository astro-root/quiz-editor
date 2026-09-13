"use client";

import { History } from "lucide-react";
import { HistoryEntry } from "@/lib/types";

interface Props {
  entries: HistoryEntry[];
}

const fieldLabel: Record<HistoryEntry["field"], string> = {
  status: "ステータス",
  proofreadStatus: "校正状態",
};

const valueLabel: Record<string, string> = {
  draft: "下書き",
  completed: "作問完了",
  adopted: "採用",
  rejected: "不採用",
  unchecked: "未確認",
  in_review: "校正中",
  needs_fix: "要修正",
  approved: "承認済み",
  on_hold: "保留",
};

function formatTime(ms: number) {
  if (!ms) return "";
  const d = new Date(ms);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(
    2,
    "0"
  )}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ステータス・校正状態の変更履歴のみを表示する（本文などは対象外。
// 理由はuseHistory.tsのコメントを参照）。
export function HistoryPanel({ entries }: Props) {
  if (entries.length === 0) return null;
  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-400">
        <History size={13} />
        変更履歴
      </p>
      <div className="max-h-32 space-y-1 overflow-y-auto">
        {entries.map((h) => (
          <p key={h.id} className="text-xs text-slate-500">
            <span className="text-slate-400">{formatTime(h.createdAt)}</span>{" "}
            {h.authorName || "匿名"}が{fieldLabel[h.field]}を
            {valueLabel[h.from] ?? h.from}→{valueLabel[h.to] ?? h.to}に変更
          </p>
        ))}
      </div>
    </div>
  );
}
