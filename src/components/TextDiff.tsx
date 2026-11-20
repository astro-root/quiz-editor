import { diffChars } from "@/lib/diff";

// 変更前と変更後の差分。消えた部分は赤の取り消し線、増えた部分は緑の下線。色だけに頼らず、記号でも分かるようにしてある。
export function TextDiff({ before, after, className = "" }: { before: string; after: string; className?: string }) {
  const parts = diffChars(before, after);
  return (
    <p className={`whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700 ${className}`}>
      {parts.map((p, i) =>
        p.type === "same" ? <span key={i}>{p.text}</span>
        : p.type === "add" ? <ins key={i} className="rounded-sm bg-emerald-100 text-emerald-800 no-underline decoration-emerald-500" title="追加">{p.text}</ins>
        : <del key={i} className="rounded-sm bg-rose-100 text-rose-700 decoration-rose-500" title="削除">{p.text}</del>
      )}
      {parts.length === 0 && <span className="text-slate-300">（空）</span>}
    </p>
  );
}
