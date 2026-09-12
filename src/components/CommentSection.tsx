"use client";

import { useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { useComments } from "@/lib/useComments";

interface Props {
  setId: string;
  questionId: string;
}

function formatTime(ms: number) {
  if (!ms) return "";
  const d = new Date(ms);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(
    2,
    "0"
  )}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// コメントは役割を問わず全メンバーが投稿できる（校正・レビュー用）。
export function CommentSection({ setId, questionId }: Props) {
  const { comments, addComment } = useComments(setId, questionId);
  const [text, setText] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    await addComment(text);
    setText("");
  }

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-400">
        <MessageCircle size={13} />
        コメント {comments.length > 0 && `(${comments.length})`}
      </p>
      {comments.length > 0 && (
        <div className="mb-2 max-h-40 space-y-2 overflow-y-auto pr-1">
          {comments.map((c) => (
            <div key={c.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <div className="mb-0.5 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">
                  {c.authorName || "匿名"}
                </span>
                <span className="text-[10px] text-slate-400">
                  {formatTime(c.createdAt)}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-slate-700">{c.body}</p>
            </div>
          ))}
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex gap-1.5">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="コメントを追加"
          className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-lg bg-slate-100 px-3 text-slate-500 hover:bg-slate-200"
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}
