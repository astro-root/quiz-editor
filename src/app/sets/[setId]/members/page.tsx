"use client";

import { useMemo, useState } from "react";
import { UserPlus } from "lucide-react";
import { useSetContext } from "@/lib/SetContext";
import { useQuestionStore } from "@/lib/QuestionsContext";
import { computeStats } from "@/lib/stats";
import { canManageMembers, roleLabel } from "@/lib/permissions";
import { Avatar } from "@/components/Avatar";
import { ShareDialog } from "@/components/ShareDialog";

const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);

export default function MembersPage() {
  const { set, role, personOf } = useSetContext();
  const { live, trash } = useQuestionStore();
  const [show, setShow] = useState(false);
  const stats = useMemo(() => computeStats(live), [live]);
  const total = useMemo(() => ({
    created: live.length,
    adopted: live.filter((q) => q.status === "adopted").length,
    rejected: live.filter((q) => q.status === "rejected").length,
    approved: live.filter((q) => q.proofreadStatus === "approved").length,
  }), [live]);
  // 統計の行：統計がある人＋現メンバー（問題ゼロの人も表示）
  const uids = Array.from(new Set([...stats.map((s) => s.uid), ...Object.keys(set.members)]));
  const byUid = new Map(stats.map((s) => [s.uid, s]));

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[["作成", total.created], ["採用", total.adopted], ["却下", total.rejected], ["裏どり確認済み", total.approved]].map(([l, v]) => (
          <div key={l as string} className="rounded-xl border border-slate-200 bg-surface p-3 text-center">
            <p className="text-2xl font-semibold text-slate-700">{v}</p>
            <p className="text-xs text-slate-400">{l}</p>
          </div>
        ))}
      </div>

      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm text-slate-500">メンバー別の状況（ゴミ箱の{trash.length}件は含みません）</p>
        <button onClick={() => setShow(true)} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-surface px-3 py-1.5 text-sm text-slate-600 hover:border-brand-300 hover:text-accent">
          <UserPlus size={14} />{canManageMembers(role) ? "ユーザーを招待" : "メンバー一覧"}
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-surface">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-slate-50 text-xs text-slate-400">
            <tr>
              <th className="p-2 text-left font-normal">ユーザー</th><th className="p-2 text-left font-normal">権限</th>
              <th className="p-2 text-right font-normal">作成</th><th className="p-2 text-right font-normal">採用</th><th className="p-2 text-right font-normal">却下</th>
              <th className="p-2 text-right font-normal">採用率</th><th className="p-2 text-right font-normal">裏どり担当</th><th className="p-2 text-right font-normal">完了</th>
            </tr>
          </thead>
          <tbody>
            {uids.map((uid) => {
              const s = byUid.get(uid);
              const p = personOf(uid, live.find((q) => q.authorUid === uid)?.authorName);
              const r = set.members[uid];
              return (
                <tr key={uid} className="border-t border-slate-100">
                  <td className="p-2"><span className="flex items-center gap-2"><Avatar name={p.name} photoURL={p.photoURL} size={24} /><span className={p.known ? "text-slate-700" : "text-slate-400"}>{p.name}</span></span></td>
                  <td className="p-2 text-xs text-slate-500">{r ? roleLabel[r] : "退出"}</td>
                  <td className="p-2 text-right tabular-nums">{s?.created ?? 0}</td>
                  <td className="p-2 text-right tabular-nums text-emerald-400">{s?.adopted ?? 0}</td>
                  <td className="p-2 text-right tabular-nums text-rose-400">{s?.rejected ?? 0}</td>
                  <td className="p-2 text-right tabular-nums" title={`判定済みのうちの採用率：${pct(s?.decidedRate ?? null)}`}>{pct(s?.adoptRate ?? null)}</td>
                  <td className="p-2 text-right tabular-nums">{s?.assigned ?? 0}</td>
                  <td className="p-2 text-right tabular-nums">{s?.approved ?? 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-400">採用率＝採用 ÷ 作成。ホバーすると「判定済み（採用＋却下）に対する採用率」が見られます。</p>
      {show && <ShareDialog set={set} isAdmin={canManageMembers(role)} onClose={() => setShow(false)} />}
    </div>
  );
}
