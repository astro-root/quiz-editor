"use client";

import { useState } from "react";
import { Plus, Tag } from "lucide-react";

interface Props {
  genres: string[];
  onAdd: (genre: string) => Promise<void>;
}

// ジャンルは管理者・問題統括が作成し、全員がドロップダウンから選ぶ。
export function GenreManager({ genres, onAdd }: Props) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!value.trim()) return;
    setSaving(true);
    try {
      await onAdd(value.trim());
      setValue("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-400">
        <Tag size={13} />
        ジャンル管理
      </p>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {genres.length === 0 && <span className="text-xs text-slate-300">まだジャンルがありません</span>}
        {genres.map((g) => (
          <span key={g} className="rounded-full bg-brand-50 px-2.5 py-1 text-xs text-brand-600">{g}</span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="新しいジャンル名"
          className="flex-1 rounded-lg border border-slate-200 p-2 text-sm focus:border-brand-400 focus:outline-none"
        />
        <button
          onClick={handleAdd}
          disabled={saving}
          className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
        >
          <Plus size={14} />
          追加
        </button>
      </div>
    </div>
  );
}
