import { Fragment, ReactNode } from "react";

// お知らせ用の、簡単なマークダウン表示。
// 使えるもの：見出し（# ## ###）、太字（**）、斜体（* や _）、取り消し線（~~）、コード（` と ```）、リスト（- と 1.）、引用（>）、区切り線（---）、リンク（[文字](https://…)・URLだけでも可）。
// HTML は、そのまま文字として表示する（実行されない）。リンクは、http・https・mailto だけ。
const INLINE = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(~~[^~\n]+~~)|(\[[^\]\n]+\]\((?:https?:\/\/[^\s)]+|mailto:[^\s)]+)\))|(https?:\/\/[^\s<]*[^\s<.,;:!?)\]'"」。、])|(\*[^*\s][^*\n]*\*)|(_[^_\s][^_\n]*_)/g;

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const m of text.matchAll(INLINE)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const k = `${key}-${n++}`;
    const tok = m[0];
    if (m[1]) out.push(<code key={k} className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.9em] text-slate-700">{tok.slice(1, -1)}</code>);
    else if (m[2]) out.push(<strong key={k} className="font-semibold text-slate-700">{inline(tok.slice(2, -2), k)}</strong>);
    else if (m[3]) out.push(<del key={k}>{inline(tok.slice(2, -2), k)}</del>);
    else if (m[4]) {
      const mm = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/)!;
      out.push(<a key={k} href={mm[2]} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-accent underline">{inline(mm[1], k)}</a>);
    } else if (m[5]) out.push(<a key={k} href={tok} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-accent underline">{tok}</a>);
    else out.push(<em key={k}>{inline(tok.slice(1, -1), k)}</em>);
    last = at + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const UL = /^\s*[-*+]\s+/;
const OL = /^\s*\d+[.)]\s+/;

export function Markdown({ text, className = "" }: { text: string; className?: string }) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let b = 0;
  const special = (l: string) => /^\s*```/.test(l) || /^#{1,3}\s/.test(l) || /^\s*>/.test(l) || UL.test(l) || OL.test(l) || /^\s*(-{3,}|\*{3,})\s*$/.test(l);

  while (i < lines.length) {
    const line = lines[i];
    const key = `b${b++}`;
    if (!line.trim()) { i++; continue; }

    if (/^\s*```/.test(line)) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) code.push(lines[i++]);
      i++;
      blocks.push(<pre key={key} className="mb-2 overflow-x-auto rounded-lg bg-slate-100 p-2 font-mono text-[0.9em] leading-relaxed text-slate-700"><code>{code.join("\n")}</code></pre>);
      continue;
    }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const cls = h[1].length === 1 ? "mb-1 mt-2 text-sm font-semibold text-slate-800" : h[1].length === 2 ? "mb-1 mt-2 text-[13px] font-semibold text-slate-700" : "mb-1 mt-1.5 text-xs font-semibold text-slate-600";
      blocks.push(<p key={key} className={cls}>{inline(h[2], key)}</p>);
      i++;
      continue;
    }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { blocks.push(<hr key={key} className="my-2 border-slate-200" />); i++; continue; }
    if (/^\s*>/.test(line)) {
      const q: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) q.push(lines[i++].replace(/^\s*>\s?/, ""));
      blocks.push(<blockquote key={key} className="mb-2 border-l-2 border-slate-300 pl-3 text-slate-500">{q.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{inline(l, `${key}-${j}`)}</Fragment>)}</blockquote>);
      continue;
    }
    if (UL.test(line) || OL.test(line)) {
      const ordered = OL.test(line);
      const items: string[] = [];
      while (i < lines.length && (ordered ? OL.test(lines[i]) : UL.test(lines[i]))) items.push(lines[i++].replace(ordered ? OL : UL, ""));
      const Tag = ordered ? "ol" : "ul";
      blocks.push(<Tag key={key} className={`mb-2 space-y-0.5 pl-5 ${ordered ? "list-decimal" : "list-disc"}`}>{items.map((t, j) => <li key={j}>{inline(t, `${key}-${j}`)}</li>)}</Tag>);
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !special(lines[i])) para.push(lines[i++]);
    if (para.length === 0) { para.push(lines[i++]); }
    blocks.push(<p key={key} className="mb-2">{para.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{inline(l, `${key}-${j}`)}</Fragment>)}</p>);
  }
  return <div className={`break-words ${className}`}>{blocks}</div>;
}
