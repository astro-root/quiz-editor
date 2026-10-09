import { Question, QuestionSet } from "./types";
import { GenreIndex } from "./genres";

// 全角/半角・大文字小文字・カタカナ/ひらがなの差を吸収する
export function normalizeText(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u30a1-\u30f6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

export interface Filters {
  text: string;
  genreId: string; // "" = すべて
  subGenreId: string;
  roundId: string; // "" すべて / "none" 未指定
  judge: "" | "undecided" | "adopted" | "rejected";
  proofread: "" | "unchecked" | "assigned" | "in_review" | "approved" | "needs_fix" | "on_hold";
  author: string; // uid
  assignee: string; // uid | "me" | "none"
  source: "" | "with" | "without";
  from: string; // yyyy-mm-dd
  to: string;
}
export const EMPTY_FILTERS: Filters = {
  text: "", genreId: "", subGenreId: "", roundId: "", judge: "", proofread: "",
  author: "", assignee: "", source: "", from: "", to: "",
};

export function activeFilterCount(f: Filters): number {
  return (Object.keys(f) as (keyof Filters)[]).filter((k) => k !== "text" && f[k] !== "").length;
}

// 検索対象：問題文・答え・別解・解説・出典・備考・正誤基準・タグ・作成者・ジャンル名
export function buildSearchText(q: Question, set: QuestionSet, gi: GenreIndex): string {
  const authorName = set.memberProfiles?.[q.authorUid]?.displayName || q.authorName;
  return normalizeText(
    [
      q.body, q.answer, ...q.altAnswers, q.explanation, ...q.sources, q.memo,
      q.judgingCriteria, ...q.tags, authorName,
      gi.majorName(q.genreId), gi.subName(q.genreId, q.subGenreId),
    ].join("\n")
  );
}

export function applyFilters(
  list: Question[],
  f: Filters,
  searchTexts: Map<string, string>,
  uid: string
): Question[] {
  const terms = normalizeText(f.text).split(/\s+/).filter(Boolean);
  const from = f.from ? new Date(f.from + "T00:00:00").getTime() : 0;
  const to = f.to ? new Date(f.to + "T23:59:59.999").getTime() : Infinity;
  return list.filter((q) => {
    if (f.genreId && q.genreId !== f.genreId) return false;
    if (f.subGenreId && q.subGenreId !== f.subGenreId) return false;
    if (f.roundId === "none" ? q.roundId !== "" : f.roundId && q.roundId !== f.roundId) return false;
    if (f.judge === "undecided" && (q.status === "adopted" || q.status === "rejected")) return false;
    if ((f.judge === "adopted" || f.judge === "rejected") && q.status !== f.judge) return false;
    if (f.proofread === "assigned") {
      if (!(q.proofreadStatus === "unchecked" && q.assigneeUid)) return false;
    } else if (f.proofread === "unchecked") {
      if (!(q.proofreadStatus === "unchecked" && !q.assigneeUid)) return false;
    } else if (f.proofread && q.proofreadStatus !== f.proofread) return false;
    if (f.author && q.authorUid !== f.author) return false;
    if (f.assignee === "me" ? q.assigneeUid !== uid : f.assignee === "none" ? q.assigneeUid !== "" : f.assignee && q.assigneeUid !== f.assignee) return false;
    const hasSrc = q.sources.some((s) => s.trim());
    if (f.source === "with" && !hasSrc) return false;
    if (f.source === "without" && hasSrc) return false;
    if (q.createdAt && (q.createdAt < from || q.createdAt > to)) return false;
    if (terms.length) {
      const t = searchTexts.get(q.id) ?? "";
      for (const term of terms) if (!t.includes(term)) return false;
    }
    return true;
  });
}
