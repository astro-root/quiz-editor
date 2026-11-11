import { AlertTriangle } from "lucide-react";
import { AnswerDup } from "@/lib/QuestionsContext";

// 同じ答え（別解を含む）の問題が既にあるときの、お知らせ。保存は止めない。
export function AnswerDupNotice({ dups, personName }: { dups: AnswerDup[]; personName: (uid: string, fallback: string) => string }) {
  if (dups.length === 0) return null;
  const shown = dups.slice(0, 3);
  return (
    <div role="status" className="mb-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-warn-strong">
      <p className="flex items-center gap-1.5 font-medium"><AlertTriangle size={13} />同じ答えの問題が、すでに{dups.length}件あります</p>
      <ul className="mt-1 space-y-0.5">
        {shown.map(({ question: q, matched }) => (
          <li key={q.id} className="truncate">
            「{matched}」… {q.body.trim().slice(0, 40) || "（問題文なし）"}{q.body.trim().length > 40 ? "…" : ""}（{personName(q.authorUid, q.authorName)}）
          </li>
        ))}
        {dups.length > shown.length && <li>ほか {dups.length - shown.length} 件</li>}
      </ul>
    </div>
  );
}
