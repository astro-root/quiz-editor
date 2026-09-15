"use client";

import { useMemo, useRef, useState } from "react";
import { CheckCircle2, CircleDashed, XCircle, Download, Upload, ChevronDown, ChevronUp } from "lucide-react";
import { Question, Role } from "@/lib/types";
import { statusLabel } from "@/lib/permissions";
import { questionsToCsv, csvToQuestions, csvFileName, ImportedQuestion } from "@/lib/csv";
import { InlineQuestionEditor } from "./InlineQuestionEditor";

interface Props {
  questions: Question[];
  setId: string;
  setName: string;
  role: Role;
  uid: string | undefined;
  genres: string[];
  canImport: boolean;
  onImportRows: (rows: ImportedQuestion[]) => Promise<void>;
  onUpdate: (id: string, patch: Partial<Question>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  findDuplicate: (body: string, excludeId?: string) => Question | null;
}

const statusStyle: Record<Question["status"], { className: string; icon: React.ReactNode }> = {
  draft: { className: "bg-slate-100 text-slate-500", icon: <CircleDashed size={12} /> },
  completed: { className: "bg-sky-50 text-sky-600", icon: <CheckCircle2 size={12} /> },
  adopted: { className: "bg-emerald-50 text-emerald-600", icon: <CheckCircle2 size={12} /> },
  rejected: { className: "bg-rose-50 text-rose-500", icon: <XCircle size={12} /> },
};

const proofreadStyle: Record<Question["proofreadStatus"], string> = {
  unchecked: "bg-amber-50 text-amber-600",
  in_review: "bg-sky-50 text-sky-600",
  needs_fix: "bg-rose-50 text-rose-500",
  approved: "bg-brand-50 text-brand-600",
  on_hold: "bg-slate-100 text-slate-500",
};

const proofreadLabel: Record<Question["proofreadStatus"], string> = {
  unchecked: "未確認",
  in_review: "校正中",
  needs_fix: "要修正",
  approved: "承認済み",
  on_hold: "保留",
};

const selectClass =
  "rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-600 focus:border-brand-400 focus:outline-none";

export function QuestionList({
  questions,
  setId,
  setName,
  role,
  uid,
  genres,
  canImport,
  onImportRows,
  onUpdate,
  onDelete,
  findDuplicate,
}: Props) {
  const [authorFilter, setAuthorFilter] = useState("all");
  const [genreFilter, setGenreFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [proofreadFilter, setProofreadFilter] = useState("all");
  const [importing, setImporting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const authors = useMemo(
    () => Array.from(new Set(questions.map((q) => q.authorName).filter(Boolean))),
    [questions]
  );
  const genreOptions = useMemo(
    () => Array.from(new Set(questions.map((q) => q.genre).filter(Boolean))),
    [questions]
  );
  const tags = useMemo(
    () => Array.from(new Set(questions.flatMap((q) => q.tags))),
    [questions]
  );

  const filtered = questions.filter((q) => {
    if (authorFilter !== "all" && q.authorName !== authorFilter) return false;
    if (genreFilter !== "all" && q.genre !== genreFilter) return false;
    if (tagFilter !== "all" && !q.tags.includes(tagFilter)) return false;
    if (statusFilter !== "all" && q.status !== statusFilter) return false;
    if (proofreadFilter !== "all" && q.proofreadStatus !== proofreadFilter) return false;
    return true;
  });

  function handleExport() {
    const csv = questionsToCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = csvFileName(setName);
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const rows = csvToQuestions(text);
      await onImportRows(rows);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <select value={authorFilter} onChange={(e) => setAuthorFilter(e.target.value)} className={selectClass}>
          <option value="all">作問者：すべて</option>
          {authors.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={genreFilter} onChange={(e) => setGenreFilter(e.target.value)} className={selectClass}>
          <option value="all">ジャンル：すべて</option>
          {genreOptions.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className={selectClass}>
          <option value="all">タグ：すべて</option>
          {tags.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass}>
          <option value="all">ステータス：すべて</option>
          <option value="draft">下書き</option>
          <option value="completed">作問完了</option>
          <option value="adopted">採用</option>
          <option value="rejected">不採用</option>
        </select>
        <select value={proofreadFilter} onChange={(e) => setProofreadFilter(e.target.value)} className={selectClass}>
          <option value="all">校正：すべて</option>
          <option value="unchecked">未確認</option>
          <option value="in_review">校正中</option>
          <option value="needs_fix">要修正</option>
          <option value="approved">承認済み</option>
          <option value="on_hold">保留</option>
        </select>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm hover:border-brand-300 hover:text-brand-600"
        >
          <Download size={13} />
          CSVエクスポート
        </button>
        {canImport && (
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm hover:border-brand-300 hover:text-brand-600 disabled:opacity-50"
            >
              <Upload size={13} />
              {importing ? "取り込み中…" : "CSVインポート"}
            </button>
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImportFile} className="hidden" />
          </>
        )}
      </div>

      <p className="mb-2 text-xs text-slate-400">クリックすると詳細を開いて編集できます</p>

      <div className="space-y-2">
        {filtered.map((q, i) => (
          <div key={q.id}>
            {expandedId === q.id ? (
              <div>
                <button
                  onClick={() => setExpandedId(null)}
                  className="mb-1.5 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
                >
                  <ChevronUp size={13} />
                  閉じる
                </button>
                <InlineQuestionEditor
                  setId={setId}
                  question={q}
                  role={role}
                  uid={uid}
                  genres={genres}
                  onUpdate={onUpdate}
                  onDelete={async (id) => {
                    if (confirm("この問題を削除しますか？")) {
                      await onDelete(id);
                      setExpandedId(null);
                    }
                  }}
                  findDuplicate={findDuplicate}
                />
              </div>
            ) : (
              <button
                onClick={() => setExpandedId(q.id)}
                className="flex w-full items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-3.5 text-left text-sm shadow-sm hover:border-brand-300"
              >
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-xs text-slate-300">
                    Q{String(i + 1).padStart(3, "0")}
                    {q.genre && (
                      <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">{q.genre}</span>
                    )}
                  </p>
                  <p className="truncate text-slate-700">{q.body || "（未入力）"}</p>
                  <p className="truncate text-brand-600">{q.answer || "（未入力）"}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-slate-500">
                  <span>{q.authorName || "―"}</span>
                  <span className="flex gap-1">
                    {q.tags.map((t) => (
                      <span key={t} className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-600">{t}</span>
                    ))}
                  </span>
                  <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 ${statusStyle[q.status].className}`}>
                    {statusStyle[q.status].icon}
                    {statusLabel[q.status]}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 ${proofreadStyle[q.proofreadStatus]}`}>
                    {proofreadLabel[q.proofreadStatus]}
                  </span>
                </div>
              </button>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="p-4 text-center text-sm text-slate-400">条件に合う問題がありません</p>
        )}
      </div>
    </div>
  );
}
