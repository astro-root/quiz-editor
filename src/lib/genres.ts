import { GenreNode, QuestionSet } from "./types";

export function newId(prefix = "g"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

// genreTree があればそれを使い、無ければ旧 genres（文字列配列）から仮想的に作る。
// 旧データの question.genre は文字列そのものなので、ノードIDを名前と同一にして参照を壊さない。
// 名前を変更してもIDは変わらないため、問題側のデータ書き換えは不要。
export function effectiveTree(set: Pick<QuestionSet, "genreTree" | "genres">): GenreNode[] {
  if (set.genreTree && set.genreTree.length > 0) return set.genreTree;
  return (set.genres ?? []).map((g) => ({ id: g, name: g, subs: [] }));
}

export interface GenreIndex {
  majorName: (id: string) => string;
  subName: (majorId: string, subId: string) => string;
  subsOf: (majorId: string) => { id: string; name: string }[];
}

export function indexTree(tree: GenreNode[]): GenreIndex {
  const byId = new Map(tree.map((n) => [n.id, n]));
  return {
    // 削除済みジャンルを参照する古い問題でも落とさない
    majorName: (id) => (id ? byId.get(id)?.name ?? `${id}（削除済み）` : ""),
    subName: (m, s) => (s ? byId.get(m)?.subs.find((x) => x.id === s)?.name ?? "（削除済み）" : ""),
    subsOf: (m) => byId.get(m)?.subs ?? [],
  };
}
