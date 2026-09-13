"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Pencil } from "lucide-react";
import { useSetContext } from "@/lib/SetContext";
import { canEditNotice, canManageGenres } from "@/lib/permissions";
import { GenreManager } from "@/components/GenreManager";

// フォルダを開いて最初に表示される「お知らせページ」。
// 管理者が自由記述し、ここから作問ページへ進む。
export default function SetNoticePage() {
  const { set, role, addGenre, updateNotice } = useSetContext();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(set.noticeBody);

  async function handleSave() {
    await updateNotice(draft);
    setEditing(false);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-500">お知らせ</h2>
          {canEditNotice(role) && !editing && (
            <button
              onClick={() => {
                setDraft(set.noticeBody);
                setEditing(true);
              }}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-brand-600"
            >
              <Pencil size={12} />
              編集
            </button>
          )}
        </div>

        {editing ? (
          <div>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={8}
              placeholder="メンバーに読んでほしいこと（作問方針、締切、注意事項など）を自由に書けます"
              className="mb-3 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
            <div className="flex gap-2">
              <button onClick={handleSave} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
                保存
              </button>
              <button onClick={() => setEditing(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-500 hover:bg-slate-50">
                キャンセル
              </button>
            </div>
          </div>
        ) : set.noticeBody ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{set.noticeBody}</p>
        ) : (
          <p className="text-sm text-slate-300">まだお知らせはありません。</p>
        )}
      </div>

      {canManageGenres(role) && (
        <div className="mb-6">
          <GenreManager genres={set.genres} onAdd={addGenre} />
        </div>
      )}

      <Link
        href={`/sets/${set.id}/write`}
        className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
      >
        作問ページへ進む
        <ArrowRight size={16} />
      </Link>
    </motion.div>
  );
}
