import { GenreNode, Question, Round } from "./types";

// ジャンル別・Round別の問題数の集計。ゴミ箱の問題は、呼び出し側で除いて渡す。
export interface CountRow {
  key: string;
  name: string;
  total: number;
  adopted: number;
  rejected: number;
  completed: number; // 作問完了（採用・却下の前）
  draft: number; // 下書き
}
export interface GenreRow extends CountRow {
  subs: CountRow[];
}
export interface MatrixRow {
  key: string;
  name: string;
  cells: number[]; // cols と同じ順の、採用問題の数
  total: number;
}
export interface Breakdown {
  total: CountRow;
  approved: number; // 裏どり確認済み
  drafts: number; // 下書き
  completed: number; // 作問完了
  parallel: number; // パラレル
  current: number; // 時事
  genres: GenreRow[]; // 設定のジャンルの順 + 未設定
  rounds: CountRow[]; // 設定の Round の順 + Round未指定
  matrix: { cols: { key: string; name: string }[]; rows: MatrixRow[] }; // 採用された問題のみ
}

const blank = (key: string, name: string): CountRow => ({ key, name, total: 0, adopted: 0, rejected: 0, completed: 0, draft: 0 });
function add(r: CountRow, q: Question) {
  r.total++;
  if (q.status === "adopted") r.adopted++;
  else if (q.status === "rejected") r.rejected++;
  else if (q.status === "completed") r.completed++;
  else r.draft++;
}

export function computeBreakdown(live: Question[], tree: GenreNode[], rounds: Round[]): Breakdown {
  const majors = new Map<string, GenreRow>();
  for (const g of tree) majors.set(g.id, { ...blank(g.id, g.name), subs: g.subs.map((s) => blank(`${g.id}/${s.id}`, s.name)) });
  const noGenre: GenreRow = { ...blank("", "未設定"), subs: [] };
  const subNone = new Map<string, CountRow>();
  const roundRows = new Map(rounds.map((r) => [r.id, blank(r.id, r.name)] as const));
  const noRound = blank("", "Round未指定");
  const total = blank("all", "全体");
  const cell = new Map<string, number>();
  let approved = 0, drafts = 0, completed = 0, parallel = 0, current = 0;

  for (const q of live) {
    add(total, q);
    if (q.proofreadStatus === "approved") approved++;
    if (q.status === "draft") drafts++;
    if (q.status === "completed") completed++;
    if (q.parallel) parallel++;
    if (q.current) current++;

    // ジャンルの設定に無いID（旧データ・削除済み）は、「未設定」にまとめる
    const g = majors.get(q.genreId) ?? noGenre;
    add(g, q);
    if (g !== noGenre) {
      const s = q.subGenreId ? g.subs.find((x) => x.key === `${g.key}/${q.subGenreId}`) : undefined;
      if (s) add(s, q);
      else {
        let n = subNone.get(g.key);
        if (!n) subNone.set(g.key, (n = blank(`${g.key}/`, "小ジャンル未設定")));
        add(n, q);
      }
    }

    const r = roundRows.get(q.roundId) ?? noRound;
    add(r, q);
    if (q.status === "adopted") {
      const k = `${g.key}|${r.key}`;
      cell.set(k, (cell.get(k) ?? 0) + 1);
    }
  }

  const genres = [...majors.values()];
  for (const g of genres) {
    const n = subNone.get(g.key);
    if (n) g.subs.push(n);
  }
  if (noGenre.total > 0) genres.push(noGenre);

  const roundList = [...roundRows.values()];
  if (noRound.total > 0) roundList.push(noRound);

  const cols = rounds.map((r) => ({ key: r.id, name: r.name }));
  if (noRound.adopted > 0) cols.push({ key: "", name: noRound.name });
  const rows: MatrixRow[] = genres
    .filter((g) => g.adopted > 0)
    .map((g) => ({ key: g.key, name: g.name, cells: cols.map((c) => cell.get(`${g.key}|${c.key}`) ?? 0), total: g.adopted }));

  return { total, approved, drafts, completed, parallel, current, genres, rounds: roundList, matrix: { cols, rows } };
}
