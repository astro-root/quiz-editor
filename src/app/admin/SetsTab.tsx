"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronRight, Loader2 } from "lucide-react";
import { AdminUser, loadQuestions } from "@/lib/adminData";
import { Question, QuestionSet } from "@/lib/types";
import { proofreadLabel, roleLabel, statusLabel } from "@/lib/permissions";
import { fmt } from "./AccountsTab";

const PAGE = 50;
type SetSort = "updated" | "name" | "members";
type QFilter = "all" | "adopted" | "rejected" | "completed" | "draft" | "trash";

// 問題セットの一覧と、その中身（読み取り専用）。運営者は、ここから編集はできない。
export function SetsTab({ sets, accounts, focusSetId, onFocusDone, onOpenAccount }: {
  sets: QuestionSet[]; accounts: AdminUser[]; focusSetId: string | null; onFocusDone: () => void; onOpenAccount: (uid: string) => void;
}) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SetSort>("updated");
  const [selected, setSelected] = useState<string | null>(null);
  const names = useMemo(() => new Map(accounts.map((a) => [a.uid, a.displayName || a.email])), [accounts]);

  useEffect(() => {
    if (focusSetId) { setSelected(focusSetId); onFocusDone(); }
  }, [focusSetId, onFocusDone]);

  const set = sets.find((s) => s.id === selected);
  if (set) return <SetDetail set={set} names={names} onBack={() => setSelected(null)} onOpenAccount={onOpenAccount} />;

  const t = q.trim().toLowerCase();
  const list = sets
    .filter((s) => !t || s.name.toLowerCase().includes(t) || (names.get(s.ownerId) ?? "").toLowerCase().includes(t))
    .sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name, "ja") : sort === "members" ? Object.keys(b.members).length - Object.keys(a.members).length : b.updatedAt - a.updatedAt));
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="セット名・オーナー名で絞り込み" aria-label="問題セットを絞り込み" className="w-full min-w-0 flex-1 rounded-lg border border-slate-200 bg-surface p-2.5 text-base focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 sm:max-w-md sm:flex-none sm:basis-96" />
        <select value={sort} onChange={(e) => setSort(e.target.value as SetSort)} aria-label="並び順" className="min-h-[44px] rounded-lg border border-slate-200 bg-surface px-2 text-sm text-slate-600">
          <option value="updated">更新が新しい順</option><option value="name">名前順</option><option value="members">メンバーが多い順</option>
        </select>
        <span className="text-xs text-slate-400">{list.length} / {sets.length} 件</span>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {list.map((s) => (
          <li key={s.id}>
            <button onClick={() => setSelected(s.id)} className="flex h-full w-full items-center gap-2 rounded-xl border border-slate-100 bg-surface p-3 text-left transition hover:border-brand-200">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-slate-700">{s.name}</span>
                <span className="block truncate text-xs text-slate-400">オーナー：{names.get(s.ownerId) ?? s.ownerId}・メンバー {Object.keys(s.members).length}人</span>
                <span className="block text-[11px] text-slate-300">更新：{fmt(s.updatedAt)}</span>
              </span>
              <ChevronRight size={16} className="shrink-0 text-slate-300" />
            </button>
          </li>
        ))}
      </ul>
      {list.length === 0 && <p className="py-10 text-center text-sm text-slate-400">該当する問題セットがありません</p>}
    </div>
  );
}

function SetDetail({ set, names, onBack, onOpenAccount }: { set: QuestionSet; names: Map<string, string>; onBack: () => void; onOpenAccount: (uid: string) => void }) {
  const [qs, setQs] = useState<Question[] | null>(null);
  const [error, setError] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [filter, setFilter] = useState<QFilter>("all");

  useEffect(() => {
    let alive = true;
    setQs(null); setError("");
    loadQuestions(set.id).then((x) => alive && setQs(x)).catch((e) => { console.error(e); alive && setError("問題を読み込めませんでした"); });
    return () => { alive = false; };
  }, [set.id]);

  const roundName = (id: string) => set.rounds.find((r) => r.id === id)?.name ?? "";
  const genreName = (g: string, s: string) => {
    const major = set.genreTree.find((x) => x.id === g);
    return major ? `${major.name}${s ? ` / ${major.subs.find((x) => x.id === s)?.name ?? ""}` : ""}` : "";
  };

  const counts = useMemo(() => {
    const c = { all: 0, adopted: 0, rejected: 0, completed: 0, draft: 0, trash: 0 };
    for (const x of qs ?? []) {
      if (x.deletedAt) c.trash++;
      else { c.all++; if (x.status === "adopted") c.adopted++; else if (x.status === "rejected") c.rejected++; else if (x.status === "completed") c.completed++; else c.draft++; }
    }
    return c;
  }, [qs]);

  const list = useMemo(() => {
    const t = text.trim().toLowerCase();
    return (qs ?? []).filter((x) => {
      if (filter === "trash" ? !x.deletedAt : x.deletedAt) return false;
      if (filter === "adopted" && x.status !== "adopted") return false;
      if (filter === "rejected" && x.status !== "rejected") return false;
      if (filter === "completed" && x.status !== "completed") return false;
      if (filter === "draft" && x.status !== "draft") return false;
      return !t || [x.body, x.answer, ...x.altAnswers, x.explanation, x.authorName].some((s) => s.toLowerCase().includes(t));
    });
  }, [qs, text, filter]);

  const chips: { id: QFilter; label: string; n: number }[] = [
    { id: "all", label: "すべて", n: counts.all }, { id: "adopted", label: "採用", n: counts.adopted },
    { id: "rejected", label: "却下", n: counts.rejected }, { id: "completed", label: "作問完了", n: counts.completed }, { id: "draft", label: "下書き", n: counts.draft }, { id: "trash", label: "ゴミ箱", n: counts.trash },
  ];

  return (
    <div>
      <button onClick={onBack} className="mb-3 flex min-h-[36px] items-center gap-1 text-xs text-slate-400 hover:text-slate-600"><ArrowLeft size={12} />問題セットの一覧へ</button>
      <div className="lg:grid lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-start lg:gap-8">
        <aside className="mb-5 lg:sticky lg:top-4 lg:mb-0">
          <h2 className="mb-1 text-lg font-semibold text-slate-800">{set.name}</h2>
          <p className="mb-3 text-xs text-slate-400">作成：{fmt(set.createdAt)}<br />更新：{fmt(set.updatedAt)}</p>
          <p className="mb-1 text-xs font-medium text-slate-500">メンバー（{Object.keys(set.members).length}）</p>
          <ul className="flex flex-wrap gap-1.5">
            {Object.entries(set.members).map(([uid, role]) => (
              <li key={uid}>
                <button onClick={() => onOpenAccount(uid)} title="アカウントを開く" className="rounded-full border border-slate-200 bg-surface px-2.5 py-1 text-xs text-slate-600 hover:border-brand-300">{names.get(uid) ?? uid}<span className="ml-1.5 text-slate-400">{roleLabel[role] ?? role}{set.ownerId === uid && "・オーナー"}</span></button>
              </li>
            ))}
          </ul>
        </aside>

        <div>
          <input value={text} onChange={(e) => { setText(e.target.value); setShown(PAGE); }} placeholder="問題文・解答・作成者で絞り込み" aria-label="問題を絞り込み" className="mb-2 w-full rounded-lg border border-slate-200 bg-surface p-2.5 text-base focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100" />
          <div className="mb-3 flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <button key={c.id} onClick={() => { setFilter(c.id); setShown(PAGE); }} aria-pressed={filter === c.id} className={`min-h-[36px] rounded-full border px-3 text-xs ${filter === c.id ? "border-brand-300 bg-brand-50 text-accent" : "border-slate-200 bg-surface text-slate-500 hover:bg-slate-50"}`}>{c.label} <span className="tabular-nums">{c.n}</span></button>
            ))}
          </div>
          {error && <p role="alert" className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-danger">{error}</p>}
          {!qs && !error && <p className="flex items-center gap-2 py-6 text-sm text-slate-400"><Loader2 size={14} className="animate-spin" />読み込み中</p>}
          {qs && list.length === 0 && <p className="py-6 text-center text-sm text-slate-400">該当する問題はありません</p>}
          <ul className="space-y-2">
            {list.slice(0, shown).map((x) => {
              const isOpen = open === x.id;
              return (
                <li key={x.id} className={`rounded-xl border bg-surface p-3 ${x.deletedAt ? "border-dashed border-slate-200 opacity-70" : "border-slate-100"}`}>
                  <button onClick={() => setOpen(isOpen ? null : x.id)} aria-expanded={isOpen} className="w-full text-left">
                    <p className={`text-sm text-slate-700 ${isOpen ? "whitespace-pre-wrap break-words" : "line-clamp-2"}`}>{x.body || "（問題文なし）"}</p>
                    <p className="mt-1 text-sm font-medium text-accent-strong">{x.answer || "（解答なし）"}</p>
                    <p className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-slate-400">
                      <span>{x.deletedAt ? "ゴミ箱" : statusLabel[x.status]}</span>
                      <span>{names.get(x.authorUid) ?? x.authorName}</span>
                      {genreName(x.genreId, x.subGenreId) && <span>{genreName(x.genreId, x.subGenreId)}</span>}
                      {roundName(x.roundId) && <span>{roundName(x.roundId)}</span>}
                    </p>
                  </button>
                  {isOpen && (
                    <dl className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-500">
                      {x.altAnswers.length > 0 && <Row k="別解" v={x.altAnswers.join("、")} />}
                      {x.explanation && <Row k="解説" v={x.explanation} />}
                      {x.judgingCriteria && <Row k="正誤判定基準" v={x.judgingCriteria} />}
                      {x.memo && <Row k="備考" v={x.memo} />}
                      {x.tags.length > 0 && <Row k="タグ" v={x.tags.join("、")} />}
                      {(x.parallel || x.current) && <Row k="区分" v={[x.parallel && "パラレル", x.current && "時事"].filter(Boolean).join("、")} />}
                      {x.sources.filter(Boolean).length > 0 && <Row k="出典" v={x.sources.filter(Boolean).join("\n")} />}
                      <Row k="状態" v={`${statusLabel[x.status]}／裏どり：${proofreadLabel[x.proofreadStatus]}`} />
                    </dl>
                  )}
                </li>
              );
            })}
          </ul>
          {qs && list.length > shown && <button onClick={() => setShown((n) => n + PAGE)} className="mt-3 min-h-[44px] w-full rounded-lg border border-slate-200 bg-surface text-sm text-slate-600 hover:bg-slate-50">さらに表示（残り {list.length - shown} 件）</button>}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex gap-3"><dt className="w-20 shrink-0 text-slate-400">{k}</dt><dd className="min-w-0 flex-1 whitespace-pre-wrap break-words text-slate-600">{v}</dd></div>;
}
