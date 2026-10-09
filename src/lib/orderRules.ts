import { OrderRules, Question } from "./types";

export interface Violation {
  index: number; // 違反が見つかった位置（0始まり、連続の末尾）
  ruleId: string;
  message: string;
}

// ルール定義。新しい大会ルールはここに追加するだけで、チェックとシャッフルの両方に反映される。
// key(q)が同じ問題が maxRun 個以上連続したら違反。
interface RuleDef {
  id: keyof Omit<OrderRules, "maxRun">;
  label: string;
  key: (q: Question) => string; // 空文字は「未設定」で判定対象外
}
export const RULE_DEFS: RuleDef[] = [
  { id: "sameGenre", label: "同じ大ジャンルが連続", key: (q) => q.genreId },
  { id: "sameSub", label: "同じ小ジャンルが連続", key: (q) => (q.subGenreId ? `${q.genreId}/${q.subGenreId}` : "") },
  { id: "sameAuthor", label: "同じ作問者が連続", key: (q) => q.authorUid },
];

export function checkOrder(list: Question[], rules: OrderRules, nameOf: (key: string, ruleId: string) => string = (k) => k): Violation[] {
  const out: Violation[] = [];
  const run = Math.max(2, rules.maxRun);
  for (const def of RULE_DEFS) {
    if (!rules[def.id]) continue;
    let count = 0;
    let prevKey = "";
    for (let i = 0; i < list.length; i++) {
      const k = def.key(list[i]);
      count = k && k === prevKey ? count + 1 : k ? 1 : 0;
      prevKey = k;
      if (count >= run) {
        out.push({
          index: i,
          ruleId: def.id,
          message: `${i - run + 2}〜${i + 1}問目：${def.label}（${nameOf(k, def.id)}）`,
        });
      }
    }
  }
  return out.sort((a, b) => a.index - b.index);
}

function violatesWithPrev(seq: Question[], cand: Question, rules: OrderRules): boolean {
  const run = Math.max(2, rules.maxRun);
  for (const def of RULE_DEFS) {
    if (!rules[def.id]) continue;
    const k = def.key(cand);
    if (!k) continue;
    let n = 1;
    for (let i = seq.length - 1; i >= 0 && def.key(seq[i]) === k; i--) n++;
    if (n >= run) return true;
  }
  return false;
}

function shuffled<T>(a: T[]): T[] {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 貪欲＋ランダム再試行。完全に満たせない場合は違反が最少の配置を返す（違反数も返す）。
export function shuffleWithRules(items: Question[], rules: OrderRules, attempts = 300): { order: Question[]; violations: number } {
  let best: Question[] = shuffled(items);
  let bestV = checkOrder(best, rules).length;
  for (let t = 0; t < attempts && bestV > 0; t++) {
    const pool = shuffled(items);
    const seq: Question[] = [];
    while (pool.length) {
      let idx = pool.findIndex((c) => !violatesWithPrev(seq, c, rules));
      if (idx < 0) idx = 0; // 詰んだら妥協（違反として数えられる）
      seq.push(pool.splice(idx, 1)[0]);
    }
    const v = checkOrder(seq, rules).length;
    if (v < bestV) {
      best = seq;
      bestV = v;
    }
  }
  return { order: best, violations: bestV };
}
