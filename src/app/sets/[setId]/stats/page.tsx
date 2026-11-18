"use client";

import { useMemo } from "react";
import { MotionConfig, motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useSetContext } from "@/lib/SetContext";
import { useQuestionStore } from "@/lib/QuestionsContext";
import { computeBreakdown, CountRow } from "@/lib/breakdown";
import { usePageTitle } from "@/lib/usePageTitle";

const card = "rounded-2xl border border-slate-100 bg-surface p-5 shadow-card";
const grow = { duration: 0.5, ease: "easeOut" as const };

// 採用・却下・未判定を、色分けした1本の棒で見せる
function Bar({ row, max }: { row: CountRow; max: number }) {
  const w = (n: number) => (max > 0 ? `${(n / max) * 100}%` : "0%");
  return (
    <div className="flex h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-50" role="img" aria-label={`${row.name}：${row.total}問（採用${row.adopted}、却下${row.rejected}、未判定${row.undecided}）`}>
      <motion.div className="h-full bg-brand-500" initial={{ width: 0 }} animate={{ width: w(row.adopted) }} transition={grow} />
      <motion.div className="h-full bg-rose-300" initial={{ width: 0 }} animate={{ width: w(row.rejected) }} transition={grow} />
      <motion.div className="h-full bg-slate-200" initial={{ width: 0 }} animate={{ width: w(row.undecided) }} transition={grow} />
    </div>
  );
}

function Row({ row, max, indent, strong, chevron }: { row: CountRow; max: number; indent?: boolean; strong?: boolean; chevron?: boolean }) {
  return (
    <div className={`flex items-center gap-3 py-1.5 ${indent ? "pl-7" : ""}`}>
      {chevron && <ChevronRight size={14} className="-mr-1 shrink-0 text-slate-300 transition-transform group-open:rotate-90" />}
      <span className={`w-28 shrink-0 truncate text-sm sm:w-44 ${strong ? "font-medium text-slate-700" : "text-slate-500"}`} title={row.name}>{row.name}</span>
      <Bar row={row} max={max} />
      <span className="w-14 shrink-0 text-right text-sm tabular-nums text-slate-700">{row.total}問</span>
      <span className="hidden w-44 shrink-0 text-right text-xs tabular-nums text-slate-400 md:block">採用 {row.adopted}・却下 {row.rejected}・未判定 {row.undecided}</span>
    </div>
  );
}

function Legend() {
  return (
    <p className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
      <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-brand-500" />採用</span>
      <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-rose-300" />却下</span>
      <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-slate-200" />未判定</span>
    </p>
  );
}

// 統計。ジャンル別・Round別の問題数（採用・却下・未判定の内訳）と、ジャンル × Round の表。ゴミ箱の問題は、数えない。
export default function StatsPage() {
  usePageTitle("統計");
  const { set, tree } = useSetContext();
  const { live } = useQuestionStore();
  const b = useMemo(() => computeBreakdown(live, tree, set.rounds), [live, tree, set.rounds]);

  if (b.total.total === 0) {
    return <p className="rounded-xl border border-dashed border-slate-200 bg-surface p-6 text-center text-sm text-slate-400">まだ問題がありません。</p>;
  }

  const gMax = Math.max(0, ...b.genres.map((g) => g.total));
  const rMax = Math.max(0, ...b.rounds.map((r) => r.total));
  const cellMax = Math.max(1, ...b.matrix.rows.flatMap((r) => r.cells));
  const colTotals = b.matrix.cols.map((_, i) => b.matrix.rows.reduce((sum, r) => sum + r.cells[i], 0));
  const tiles = [
    { label: "問題数", value: b.total.total },
    { label: "下書き", value: b.drafts },
    { label: "作問完了", value: b.completed },
    { label: "採用", value: b.total.adopted },
    { label: "却下", value: b.total.rejected },
    { label: "裏どり確認済み", value: b.approved },
    { label: "パラレル", value: b.parallel },
    { label: "時事", value: b.current },
  ];

  return (
    <MotionConfig reducedMotion="user">
      <div>
        <p className="mb-3 text-xs text-slate-400">ゴミ箱の問題は含みません。</p>
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-2xl border border-slate-100 bg-surface p-4 shadow-card">
              <p className="text-xs text-slate-400">{t.label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-800">{t.value}</p>
            </div>
          ))}
        </div>

        <div className="grid items-start gap-5 xl:grid-cols-2">
          <section className={card}>
            <h2 className="mb-1 text-sm font-medium text-slate-600">ジャンル別の問題数</h2>
            <p className="mb-3 text-xs text-slate-400">大ジャンルを押すと、小ジャンルが開閉します。</p>
            <Legend />
            {b.genres.map((g) => (
              <details key={g.key || "none"} open className="group">
                <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden"><Row row={g} max={gMax} strong chevron /></summary>
                {g.subs.map((s) => <Row key={s.key} row={s} max={gMax} indent />)}
              </details>
            ))}
          </section>

          <section className={card}>
            <h2 className="mb-3 text-sm font-medium text-slate-600">Round別の問題数</h2>
            <Legend />
            {b.rounds.length === 0 ? <p className="text-sm text-slate-400">Roundがまだありません。「設定」で作成できます。</p> : b.rounds.map((r) => <Row key={r.key || "none"} row={r} max={rMax} strong />)}
          </section>
        </div>

        <section className={`${card} mt-5`}>
          <h2 className="mb-1 text-sm font-medium text-slate-600">ジャンル × Round（採用された問題）</h2>
          <p className="mb-3 text-xs text-slate-400">出題のバランスを見るための表です。色が濃いほど、多くなります。</p>
          {b.matrix.rows.length === 0 || b.matrix.cols.length === 0 ? (
            <p className="text-sm text-slate-400">採用された問題がまだありません。</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr>
                    <th className="py-1.5 pr-3 text-left text-xs font-normal text-slate-400">ジャンル</th>
                    {b.matrix.cols.map((c) => <th key={c.key || "none"} className="whitespace-nowrap px-2 py-1.5 text-center text-xs font-normal text-slate-400">{c.name}</th>)}
                    <th className="px-2 py-1.5 text-center text-xs font-normal text-slate-400">計</th>
                  </tr>
                </thead>
                <tbody>
                  {b.matrix.rows.map((r) => (
                    <tr key={r.key || "none"} className="border-t border-slate-100">
                      <th className="whitespace-nowrap py-1.5 pr-3 text-left text-sm font-normal text-slate-600">{r.name}</th>
                      {r.cells.map((n, i) => (
                        <td key={i} className="px-2 py-1.5 text-center tabular-nums text-slate-700" style={n > 0 ? { backgroundColor: `rgb(var(--brand-500) / ${0.08 + (0.35 * n) / cellMax})` } : undefined}>
                          {n > 0 ? n : <span className="text-slate-300">·</span>}
                        </td>
                      ))}
                      <td className="px-2 py-1.5 text-center font-medium tabular-nums text-slate-700">{r.total}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200">
                    <th className="py-1.5 pr-3 text-left text-sm font-medium text-slate-600">計</th>
                    {colTotals.map((n, i) => <td key={i} className="px-2 py-1.5 text-center font-medium tabular-nums text-slate-700">{n}</td>)}
                    <td className="px-2 py-1.5 text-center font-medium tabular-nums text-slate-700">{b.total.adopted}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>
      </div>
    </MotionConfig>
  );
}
