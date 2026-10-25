"use client";

import { useEffect, useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { useSetContext } from "@/lib/SetContext";
import { useQuestionStore } from "@/lib/QuestionsContext";
import { QuestionImages } from "@/components/ImageField";
import { loadImage } from "@/lib/questionImages";

const sel = "rounded-lg border border-slate-200 bg-surface p-2 text-sm";

export default function PrintPage() {
  const { set, gi } = useSetContext();
  const { live } = useQuestionStore();
  const [scope, setScope] = useState<string>(set.rounds[0] ? `round:${set.rounds[0].id}` : "adopted");
  const [mode, setMode] = useState<"question" | "answer">("question");
  const [showGenre, setShowGenre] = useState(false);

  const list = useMemo(() => {
    let l = live.filter((q) => q.status === "adopted");
    if (scope.startsWith("round:")) l = l.filter((q) => q.roundId === scope.slice(6));
    return [...l].sort((a, b) => (a.playOrder ?? Infinity) - (b.playOrder ?? Infinity) || a.order - b.order);
  }, [live, scope]);

  const unordered = list.filter((q) => q.playOrder === null).length;

  // 画像を読み込み終えてから印刷できるようにする（読み込み前に印刷すると、画像が抜けてしまう）
  const [imgsReady, setImgsReady] = useState(true);
  useEffect(() => {
    const jobs = list.flatMap((q) => q.imageMeta.filter((m) => m.field === "body" || mode === "answer").map((m) => loadImage(set.id, q.id, m.id)));
    if (jobs.length === 0) {
      setImgsReady(true);
      return;
    }
    let alive = true;
    setImgsReady(false);
    Promise.allSettled(jobs).then(() => alive && setImgsReady(true));
    return () => { alive = false; };
  }, [list, mode, set.id]);
  const label = scope.startsWith("round:")
    ? set.rounds.find((r) => r.id === scope.slice(6))?.name ?? "Round"
    : "採用問題";
  const modeLabel = mode === "answer" ? "解答付き" : "問題用紙";

  function handlePrint() {
    // PDF保存時のファイル名になるよう、印刷中だけタイトルを変える
    const prev = document.title;
    document.title = `${set.name}_${label}_${modeLabel}`;
    const restore = () => {
      document.title = prev;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <section className="mb-5 rounded-2xl border border-slate-100 bg-surface p-5 shadow-card print:hidden">
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-slate-600">
          <Printer size={15} />印刷・PDF出力
        </h2>
        <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
          <select value={scope} onChange={(e) => setScope(e.target.value)} aria-label="出力する範囲" className={sel}>
            <option value="adopted">採用問題すべて（出題順）</option>
            {set.rounds.map((r) => (
              <option key={r.id} value={`round:${r.id}`}>{r.name} の採用問題（出題順）</option>
            ))}
          </select>
          <select value={mode} onChange={(e) => setMode(e.target.value as "question" | "answer")} aria-label="出力の種類" className={sel}>
            <option value="question">問題用紙（問題文のみ）</option>
            <option value="answer">解答付き（正解・別解・解説・出典）</option>
          </select>
          <label className="flex items-center gap-1.5 text-slate-600">
            <input type="checkbox" checked={showGenre} onChange={(e) => setShowGenre(e.target.checked)} />ジャンルを表示
          </label>
        </div>
        <p className="mb-3 text-xs text-slate-400">
          {list.length}問を出力します。「印刷」を押し、印刷画面の送信先で「PDFに保存」を選ぶとPDFになります。
        </p>
        {unordered > 0 && (
          <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-warn-strong">
            出題順が未設定の問題が{unordered}問あります（作成順で末尾に並びます）。先に「出題順」タブで並びを保存してください。
          </p>
        )}
        {!imgsReady && <p className="mb-3 text-xs text-slate-400" role="status">画像を読み込み中です…</p>}
        <button
          onClick={handlePrint}
          disabled={!list.length || !imgsReady}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40"
        >
          <Printer size={14} />印刷 / PDFに保存
        </button>
      </section>

      <article className="rounded-2xl border border-slate-100 bg-surface p-6 print:rounded-none print:border-0 print:p-0">
        <header className="mb-6 border-b border-slate-300 pb-3">
          <h1 className="text-xl font-semibold text-slate-800">{set.name}</h1>
          <p className="text-sm text-slate-500">{label}　{modeLabel}　全{list.length}問</p>
        </header>
        {list.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400 print:hidden">この範囲に採用された問題がありません。</p>
        ) : (
          <ol className="space-y-5">
            {list.map((q, i) => {
              const srcs = q.sources.filter((s) => s.trim());
              return (
                <li key={q.id} className="break-inside-avoid">
                  <p className="flex gap-2">
                    <span className="shrink-0 font-semibold text-slate-800">{i + 1}.</span>
                    <span className="whitespace-pre-wrap break-words text-slate-800">{q.body}</span>
                  </p>
                  <div className="ml-6"><QuestionImages setId={set.id} q={q} field="body" /></div>
                  {showGenre && q.genreId && (
                    <p className="ml-6 mt-0.5 text-xs text-slate-400">
                      {gi.majorName(q.genreId)}{q.subGenreId && ` / ${gi.subName(q.genreId, q.subGenreId)}`}
                    </p>
                  )}
                  {mode === "answer" && (
                    <div className="ml-6 mt-1 space-y-0.5 text-sm">
                      <p className="font-medium text-slate-800">正解：{q.answer}</p>
                      <QuestionImages setId={set.id} q={q} field="answer" />
                      {q.altAnswers.length > 0 && <p className="text-slate-600">別解：{q.altAnswers.join("、")}</p>}
                      {q.explanation && <p className="whitespace-pre-wrap text-slate-600">解説：{q.explanation}</p>}
                      <QuestionImages setId={set.id} q={q} field="explanation" />
                      {srcs.length > 0 && <p className="break-words text-slate-500">出典：{srcs.join(" / ")}</p>}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </article>
    </div>
  );
}
