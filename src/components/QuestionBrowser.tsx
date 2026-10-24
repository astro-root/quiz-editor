"use client";

import { memo, useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState, ReactNode } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { Search, SlidersHorizontal, X, ExternalLink, Link2Off, Check, Ban, RotateCcw, ChevronDown } from "lucide-react";
import { Question } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { useSetContext } from "@/lib/SetContext";
import { useQuestionStore } from "@/lib/QuestionsContext";
import { applyFilters, activeFilterCount, buildSearchText, EMPTY_FILTERS, Filters } from "@/lib/search";
import { canJudge, judgeLabel, proofreadDisplay } from "@/lib/permissions";
import { PersonChip } from "./Avatar";
import { QuestionEditor } from "./QuestionEditor";

const sel = "rounded-lg border border-slate-200 bg-surface p-2 text-sm text-slate-600 focus:border-brand-400 focus:outline-none";

const judgeStyle: Record<string, string> = {
  adopted: "bg-emerald-50 text-ok",
  rejected: "bg-rose-50 text-danger",
  undecided: "bg-slate-100 text-slate-500",
};
const proofStyle: Record<string, string> = {
  unchecked: "bg-amber-50 text-warn",
  in_review: "bg-sky-50 text-info",
  needs_fix: "bg-rose-50 text-danger",
  approved: "bg-brand-50 text-accent",
  on_hold: "bg-slate-100 text-slate-500",
};

function loadFilters(key: string, initial?: Partial<Filters>): Filters {
  try {
    const raw = sessionStorage.getItem(key);
    if (raw) return { ...EMPTY_FILTERS, ...JSON.parse(raw) };
  } catch {
    /* sessionStorageが使えない環境では保存しないだけ */
  }
  return { ...EMPTY_FILTERS, ...initial };
}

interface Props {
  title?: string;
  base: Question[]; // 画面の対象範囲（全員／自分／他人など）に絞り込み済みの問題
  storageKey: string;
  initialFilters?: Partial<Filters>;
  header?: ReactNode;
  showAuthor?: boolean;
  emptyText?: string;
  onFilteredChange?: (list: Question[]) => void;
}

export function QuestionBrowser({ base, storageKey, initialFilters, header, showAuthor = true, emptyText, onFilteredChange }: Props) {
  const { user } = useAuth();
  const uid = user?.uid ?? "";
  const { set, tree, gi } = useSetContext();
  const [filters, setFilters] = useState<Filters>(() => loadFilters(storageKey, initialFilters));
  const [showPanel, setShowPanel] = useState(() => activeFilterCount(loadFilters(storageKey, initialFilters)) > 0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    try { sessionStorage.setItem(storageKey, JSON.stringify(filters)); } catch { /* noop */ }
  }, [filters, storageKey]);

  const deferred = useDeferredValue(filters);
  const searchTexts = useMemo(() => {
    const m = new Map<string, string>();
    for (const q of base) m.set(q.id, buildSearchText(q, set, gi));
    return m;
  }, [base, set, gi]);

  const filtered = useMemo(() => applyFilters(base, deferred, searchTexts, uid), [base, deferred, searchTexts, uid]);
  useEffect(() => { onFilteredChange?.(filtered); }, [filtered, onFilteredChange]);

  const authorUids = useMemo(() => Array.from(new Set(base.map((q) => q.authorUid))), [base]);
  const patch = (p: Partial<Filters>) => setFilters((f) => ({ ...f, ...p }));
  const nActive = activeFilterCount(filters);

  const parentRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  useLayoutEffect(() => { setScrollMargin(parentRef.current?.offsetTop ?? 0); }, [showPanel, header]);

  const virt = useWindowVirtualizer({
    count: filtered.length,
    estimateSize: () => 92,
    overscan: 8,
    scrollMargin,
    getItemKey: (i) => filtered[i]?.id ?? i,
  });

  const toggle = useCallback((id: string) => setExpandedId((cur) => (cur === id ? null : id)), []);
  const close = useCallback(() => setExpandedId(null), []);

  // 展開中の問題が削除・絞り込みで一覧から消えたら閉じる
  useEffect(() => {
    if (expandedId && !filtered.some((q) => q.id === expandedId)) setExpandedId(null);
  }, [filtered, expandedId]);

  const expanded = expandedId ? filtered.find((q) => q.id === expandedId) ?? null : null;

  return (
    <div>
      {header}
      <div className="sticky top-0 z-20 -mx-1 mb-3 bg-slate-50/95 px-1 pb-2 pt-1 backdrop-blur">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={filters.text}
              onChange={(e) => patch({ text: e.target.value })}
              placeholder="問題文・解答・解説・別解・出典・作成者を検索（スペースでAND）"
              className="w-full rounded-lg border border-slate-200 bg-surface p-2 pl-9 pr-8 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
            {filters.text && (
              <button onClick={() => patch({ text: "" })} aria-label="検索語を消す" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"><X size={14} /></button>
            )}
          </div>
          <button onClick={() => setShowPanel((v) => !v)} className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm ${nActive ? "border-brand-300 bg-brand-50 text-accent" : "border-slate-200 bg-surface text-slate-600"}`}>
            <SlidersHorizontal size={14} />絞り込み{nActive > 0 && `(${nActive})`}
          </button>
        </div>

        {showPanel && (
          <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-surface p-3 sm:grid-cols-3 lg:grid-cols-4">
            <select value={filters.genreId} onChange={(e) => patch({ genreId: e.target.value, subGenreId: "" })} className={sel} aria-label="大ジャンル">
              <option value="">大ジャンル：すべて</option>
              {tree.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <select value={filters.subGenreId} onChange={(e) => patch({ subGenreId: e.target.value })} disabled={!filters.genreId} className={sel} aria-label="小ジャンル">
              <option value="">小ジャンル：すべて</option>
              {gi.subsOf(filters.genreId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={filters.roundId} onChange={(e) => patch({ roundId: e.target.value })} className={sel} aria-label="Round">
              <option value="">Round：すべて</option>
              <option value="none">Round未指定</option>
              {set.rounds.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <select value={filters.judge} onChange={(e) => patch({ judge: e.target.value as Filters["judge"] })} className={sel} aria-label="採用状態">
              <option value="">採用状態：すべて</option>
              <option value="undecided">未判定のみ</option>
              <option value="adopted">採用のみ</option>
              <option value="rejected">却下のみ</option>
            </select>
            <select value={filters.proofread} onChange={(e) => patch({ proofread: e.target.value as Filters["proofread"] })} className={sel} aria-label="裏どり状態">
              <option value="">裏どり：すべて</option>
              <option value="unchecked">未着手</option>
              <option value="assigned">担当者割り当て済み</option>
              <option value="in_review">確認中</option>
              <option value="approved">確認済み</option>
              <option value="needs_fix">要修正</option>
              <option value="on_hold">保留</option>
            </select>
            <select value={filters.author} onChange={(e) => patch({ author: e.target.value })} className={sel} aria-label="作成者">
              <option value="">作成者：すべて</option>
              {authorUids.map((a) => <option key={a} value={a}>{set.memberProfiles?.[a]?.displayName || (base.find((q) => q.authorUid === a)?.authorName ?? "") || "退出したユーザー"}</option>)}
            </select>
            <select value={filters.assignee} onChange={(e) => patch({ assignee: e.target.value })} className={sel} aria-label="裏どり担当">
              <option value="">裏どり担当：すべて</option>
              <option value="me">自分の担当</option>
              <option value="none">未割り当て</option>
              {Object.keys(set.members).map((m) => <option key={m} value={m}>{set.memberProfiles?.[m]?.displayName || "名無し"}</option>)}
            </select>
            <select value={filters.source} onChange={(e) => patch({ source: e.target.value as Filters["source"] })} className={sel} aria-label="出典">
              <option value="">出典：すべて</option>
              <option value="with">出典あり</option>
              <option value="without">出典なし</option>
            </select>
            <label className="flex items-center gap-1 text-xs text-slate-400">作成日
              <input type="date" value={filters.from} onChange={(e) => patch({ from: e.target.value })} className={`${sel} min-w-0 flex-1`} />
            </label>
            <label className="flex items-center gap-1 text-xs text-slate-400">〜
              <input type="date" value={filters.to} onChange={(e) => patch({ to: e.target.value })} className={`${sel} min-w-0 flex-1`} />
            </label>
            <button onClick={() => setFilters({ ...EMPTY_FILTERS, text: filters.text })} className="rounded-lg border border-slate-200 text-sm text-slate-500 hover:bg-slate-50">条件をクリア</button>
          </div>
        )}
        <p className="mt-1.5 text-xs text-slate-400">{filtered.length}件{filtered.length !== base.length && `（全${base.length}件中）`}</p>
      </div>

      {filtered.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-200 bg-surface p-6 text-center text-sm text-slate-400">
          {base.length === 0 ? emptyText ?? "問題がありません" : "条件に合う問題がありません"}
        </p>
      )}

      <div ref={parentRef} style={{ height: virt.getTotalSize(), position: "relative" }}>
        {virt.getVirtualItems().map((v) => {
          const q = filtered[v.index];
          if (!q) return null;
          return (
            <div
              key={v.key}
              data-index={v.index}
              ref={virt.measureElement}
              style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${v.start - virt.options.scrollMargin}px)` }}
              className="pb-2"
            >
              <Row q={q} index={v.index} showAuthor={showAuthor} onOpen={toggle} />
            </div>
          );
        })}
      </div>

      {expanded && <QuestionEditor modal question={expanded} onClose={close} />}
    </div>
  );
}

const Row = memo(function Row({ q, index, showAuthor, onOpen }: { q: Question; index: number; showAuthor: boolean; onOpen: (id: string) => void }) {
  const { set, role, gi, personOf } = useSetContext();
  const store = useQuestionStore();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const judge = canJudge(role);
  const author = personOf(q.authorUid, q.authorName);
  const assignee = q.assigneeUid ? personOf(q.assigneeUid) : null;
  const round = q.roundId ? set.rounds.find((r) => r.id === q.roundId)?.name ?? "（削除済みRound）" : "";
  const sources = q.sources.filter((s) => s.trim());
  const firstUrl = sources.find((s) => /^https?:\/\//.test(s.trim()));
  const judgeKey = q.status === "adopted" ? "adopted" : q.status === "rejected" ? "rejected" : "undecided";

  // 一覧から採用/却下/未判定を直接変更する
  async function setJudge(next: "adopted" | "rejected" | "undecided") {
    const to = next === "undecided" ? "completed" : next;
    if (to === q.status) return;
    setBusy(true);
    setErr("");
    try {
      await store.updateQuestion(q.id, { status: to }, [{ field: "status", from: q.status, to }]);
    } catch (e) {
      console.error(e);
      setErr("変更に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-surface shadow-sm hover:border-brand-300">
      <div role="button" tabIndex={0} onClick={() => onOpen(q.id)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen(q.id))}
        className="flex cursor-pointer flex-col gap-2 p-3 text-left text-sm sm:flex-row sm:items-start sm:gap-3" aria-label="クリックして編集">
        <div className="min-w-0 flex-1">
          <p className="mb-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-300">
            <span>#{index + 1}</span>
            {q.genreId && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">{gi.majorName(q.genreId)}{q.subGenreId && ` / ${gi.subName(q.genreId, q.subGenreId)}`}</span>}
            {round && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-tag">{round}</span>}
          </p>
          <p className="line-clamp-2 break-words text-slate-700">{q.body || "（問題文なし）"}</p>
          <p className="truncate text-accent">{q.answer || "（解答なし）"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:shrink-0 sm:flex-col sm:items-end sm:gap-x-0">
          {showAuthor && <PersonChip name={author.name} photoURL={author.photoURL} muted={!author.known} />}
          <span className="flex flex-wrap justify-end gap-1">
            <span className={`rounded-full px-2 py-0.5 ${judgeStyle[judgeKey]}`}>{judgeLabel(q.status)}</span>
            <span className={`rounded-full px-2 py-0.5 ${proofStyle[q.proofreadStatus]}`}>{proofreadDisplay(q)}</span>
          </span>
          {assignee && <span className="text-slate-400">担当：{assignee.name}</span>}
          {sources.length > 0 ? (
            firstUrl ? (
              <a href={firstUrl.trim()} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-0.5 text-accent underline">出典あり<ExternalLink size={10} /></a>
            ) : (
              <span className="text-slate-400" title={sources.join(" / ")}>出典あり</span>
            )
          ) : (
            <span className="flex items-center gap-0.5 text-slate-300"><Link2Off size={10} />出典なし</span>
          )}
        </div>
      </div>
      {judge && (
        <div className="flex items-center gap-1.5 border-t border-slate-100 px-3 py-1.5">
          <button disabled={busy} onClick={() => setJudge("adopted")} className={`flex items-center gap-1 rounded-md px-3 py-2 text-xs sm:px-2 sm:py-1 ${q.status === "adopted" ? "bg-emerald-600 text-white" : "text-ok hover:bg-emerald-50"}`}><Check size={12} />採用</button>
          <button disabled={busy} onClick={() => setJudge("rejected")} className={`flex items-center gap-1 rounded-md px-3 py-2 text-xs sm:px-2 sm:py-1 ${q.status === "rejected" ? "bg-rose-500 text-white" : "text-danger hover:bg-rose-50"}`}><Ban size={12} />却下</button>
          {(q.status === "adopted" || q.status === "rejected") && (
            <button disabled={busy} onClick={() => setJudge("undecided")} className="flex items-center gap-1 rounded-md px-3 py-2 text-xs sm:px-2 sm:py-1 text-slate-400 hover:bg-slate-50"><RotateCcw size={12} />未判定に戻す</button>
          )}
          {err && <span className="text-xs text-danger">{err}</span>}
          <ChevronDown size={14} className="ml-auto text-slate-300" />
        </div>
      )}
    </div>
  );
});
