"use client";

import { useEffect, useMemo, useState } from "react";
import { UserPlus } from "lucide-react";
import { useSetContext } from "@/lib/SetContext";
import { useQuestionStore } from "@/lib/QuestionsContext";
import { computeStats } from "@/lib/stats";
import { canManageMembers, roleLabel } from "@/lib/permissions";
import { Avatar } from "@/components/Avatar";
import { ShareDialog } from "@/components/ShareDialog";

const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);

export default function MembersPage() {
  const { set, role, personOf, actions } = useSetContext();
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

      <ul className="space-y-2 sm:hidden">
        {uids.map((uid) => {
          const s = byUid.get(uid);
          const p = personOf(uid, live.find((q) => q.authorUid === uid)?.authorName);
          const r = set.members[uid];
          return (
            <li key={uid} className="rounded-xl border border-slate-200 bg-surface p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2"><Avatar name={p.name} photoURL={p.photoURL} size={24} /><span className={`truncate ${p.known ? "text-slate-700" : "text-slate-400"}`}>{p.name}</span></span>
                <span className="shrink-0 text-xs text-slate-500">{r ? roleLabel[r] : "退出"}</span>
              </div>
              <dl className="grid grid-cols-3 gap-2 text-center text-xs">
                {([["作成", s?.created ?? 0], ["採用", s?.adopted ?? 0], ["却下", s?.rejected ?? 0], ["採用率", pct(s?.adoptRate ?? null)], ["裏どり担当", s?.assigned ?? 0], ["完了", s?.approved ?? 0]] as [string, string | number][]).map(([l, v]) => (
                  <div key={l} className="rounded-lg bg-slate-50 py-1.5"><dt className="text-slate-400">{l}</dt><dd className="text-sm tabular-nums text-slate-700">{v}</dd></div>
                ))}
              </dl>
            </li>
          );
        })}
      </ul>

      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-surface sm:block">
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
                  <td className="p-2 text-right tabular-nums text-ok">{s?.adopted ?? 0}</td>
                  <td className="p-2 text-right tabular-nums text-danger">{s?.rejected ?? 0}</td>
                  <td className="p-2 text-right tabular-nums" title={`判定済みのうちの採用率：${pct(s?.decidedRate ?? null)}`}>{pct(s?.adoptRate ?? null)}</td>
                  <td className="p-2 text-right tabular-nums">{s?.assigned ?? 0}</td>
                  <td className="p-2 text-right tabular-nums">{s?.approved ?? 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <QuotaSection
        uids={uids.filter((u) => ["admin", "supervisor", "writer"].includes(set.members[u] ?? ""))}
        created={(u) => byUid.get(u)?.created ?? 0}
        quotas={set.quotas ?? {}}
        nameOf={(u) => personOf(u, live.find((q) => q.authorUid === u)?.authorName).name}
        editable={canManageMembers(role)}
        onSave={(next) => actions.updateMembers({ quotas: next })}
      />
      {show && <ShareDialog set={set} isAdmin={canManageMembers(role)} onClose={() => setShow(false)} />}
    </div>
  );
}

// 作問ノルマ。管理者が、メンバーごとに、作る問題数の目標を決める。進み具合は、全員が見られる。
function QuotaSection({ uids, created, quotas, nameOf, editable, onSave }: {
  uids: string[]; created: (uid: string) => number; quotas: Record<string, number>; nameOf: (uid: string) => string;
  editable: boolean; onSave: (next: Record<string, number>) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { setDraft({}); }, [quotas]);

  async function commit(uid: string) {
    const raw = (draft[uid] ?? "").trim();
    if (draft[uid] === undefined) return;
    const n = raw === "" ? 0 : Number(raw);
    if (!Number.isInteger(n) || n < 0 || n > 100000) return setMsg({ ok: false, text: "ノルマは、0〜100000の整数で入力してください（空欄か0で、解除）" });
    if (n === (quotas[uid] ?? 0)) { setDraft((d) => { const c = { ...d }; delete c[uid]; return c; }); return; }
    const next = { ...quotas };
    if (n === 0) delete next[uid]; else next[uid] = n;
    setMsg(null);
    try {
      await onSave(next);
      setMsg({ ok: true, text: "ノルマを保存しました" });
    } catch (e) {
      console.error(e);
      setMsg({ ok: false, text: "ノルマを保存できませんでした" });
    }
  }

  if (uids.length === 0) return null;
  return (
    <section className="mt-5 rounded-2xl border border-slate-100 bg-surface p-5 shadow-card">
      <h2 className="mb-1 text-sm font-medium text-slate-600">作問ノルマ</h2>
      <p className="mb-3 text-xs text-slate-400">{editable ? "メンバーごとに、作る問題数の目標を決められます。空欄か0にすると、解除されます。" : "管理者が設定した、作る問題数の目標です。"}ゴミ箱の問題は数えません。</p>
      <ul className="space-y-3">
        {uids.map((uid) => {
          const q = quotas[uid] ?? 0;
          const c = created(uid);
          return (
            <li key={uid} className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <span className="w-36 shrink-0 truncate text-sm text-slate-700 sm:w-48">{nameOf(uid)}</span>
              <div className="min-w-[8rem] flex-1">
                {q > 0 ? (
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={q} aria-valuenow={Math.min(c, q)} aria-label={`${nameOf(uid)}のノルマの進み具合`}>
                    <div className={`h-full rounded-full transition-[width] duration-500 ${c >= q ? "bg-ok" : "bg-brand-500"}`} style={{ width: `${Math.min(100, (c / q) * 100)}%` }} />
                  </div>
                ) : <span className="text-xs text-slate-300">ノルマなし</span>}
              </div>
              <span className="w-28 shrink-0 text-right text-sm tabular-nums text-slate-600">{q > 0 ? `${c} / ${q}問` : `${c}問`}</span>
              {editable && (
                <input
                  type="number" inputMode="numeric" min={0} max={100000}
                  value={draft[uid] ?? (q > 0 ? String(q) : "")}
                  onChange={(e) => setDraft((d) => ({ ...d, [uid]: e.target.value }))}
                  onBlur={() => commit(uid)}
                  onKeyDown={(e) => e.key === "Enter" && (e.currentTarget.blur())}
                  placeholder="ノルマ"
                  aria-label={`${nameOf(uid)}のノルマ`}
                  className="w-24 rounded-lg border border-slate-200 bg-surface p-2 text-right text-sm tabular-nums focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              )}
            </li>
          );
        })}
      </ul>
      <p role="status" className={`mt-2 min-h-[1.25rem] text-xs ${msg ? (msg.ok ? "text-ok" : "text-danger") : ""}`}>{msg?.text}</p>
    </section>
  );
}
