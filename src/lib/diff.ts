// 文字単位の差分（修正案の、変更前と変更後の比較に使う）。
// 先頭と末尾の同じ部分を除いてから、真ん中を、最長共通部分列（LCS）で比べる。
// 真ん中が長すぎるときは、細かい比較をやめて、「全部書き換え」として扱う（画面が固まらないように）。
export type DiffPart = { type: "same" | "add" | "del"; text: string };

const MAX_CELLS = 2_500_000;

export function diffChars(before: string, after: string): DiffPart[] {
  const a = Array.from(before);
  const b = Array.from(after);
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) { endA--; endB--; }

  const head = a.slice(0, start).join("");
  const tail = a.slice(endA).join("");
  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);
  const out: DiffPart[] = [];
  const push = (type: DiffPart["type"], text: string) => {
    if (!text) return;
    const last = out[out.length - 1];
    if (last && last.type === type) last.text += text;
    else out.push({ type, text });
  };

  push("same", head);
  if (midA.length * midB.length > MAX_CELLS) {
    push("del", midA.join(""));
    push("add", midB.join(""));
  } else {
    // LCS の長さの表を作り、後ろから、たどる
    const n = midA.length;
    const m = midB.length;
    const w = m + 1;
    const dp = new Uint32Array((n + 1) * w);
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[i * w + j] = midA[i] === midB[j] ? dp[(i + 1) * w + j + 1] + 1 : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
      }
    }
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (midA[i] === midB[j]) { push("same", midA[i]); i++; j++; }
      else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) { push("del", midA[i]); i++; }
      else { push("add", midB[j]); j++; }
    }
    while (i < n) push("del", midA[i++]);
    while (j < m) push("add", midB[j++]);
  }
  push("same", tail);
  return out;
}
