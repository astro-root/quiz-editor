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
    <div className="mt-3 border-t border-dashed border-kraft-dark pt-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-ink-soft">
        <MessageCircle size={13} />
        コメント {comments.length > 0 && `(${comments.length})`}
      </p>
      {comments.length > 0 && (
        <div className="mb-2 max-h-40 space-y-2 overflow-y-auto pr-1">
          {comments.map((c) => (
            <div key={c.id} className="rounded-lg bg-kraft/30 px-3 py-2 text-sm">
              <div className="mb-0.5 flex items-center justify-between">
                <span className="text-xs font-medium text-ink">
                  {c.authorName || "匿名"}
                </span>
                <span className="text-[10px] text-ink-faint">
                  {formatTime(c.createdAt)}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-ink">{c.body}</p>
            </div>
          ))}
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex gap-1.5">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="コメントを追加"
          className="flex-1 rounded-md border border-kraft-line bg-card px-3 py-1.5 text-sm text-ink focus:border-ink focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-kraft/50 px-3 text-ink-soft hover:bg-kraft"
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}
