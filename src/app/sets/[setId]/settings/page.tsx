"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { deleteQuestionSet } from "@/lib/deleteSet";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useSetContext } from "@/lib/SetContext";
import { useQuestionStore } from "@/lib/QuestionsContext";
import { canManageGenres } from "@/lib/permissions";
import { newId } from "@/lib/genres";
import { GenreNode, Round } from "@/lib/types";

const card = "mb-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-card";
const inputCls = "min-w-0 flex-1 rounded-lg border border-slate-200 p-2 text-sm focus:border-brand-400 focus:outline-none";

function InlineName({ value, onSave, onCancel }: { value: string; onSave: (v: string) => void; onCancel: () => void }) {
  const [v, setV] = useState(value);
  return (
    <span className="flex flex-1 items-center gap-1">
      <input autoFocus value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") onSave(v); if (e.key === "Escape") onCancel(); }} className={inputCls} />
      <button onClick={() => onSave(v)} aria-label="確定" className="text-emerald-600"><Check size={16} /></button>
      <button onClick={onCancel} aria-label="キャンセル" className="text-slate-400"><X size={16} /></button>
    </span>
  );
}

export default function SettingsPage() {
  const { set, role, tree, actions } = useSetContext();
  const { all } = useQuestionStore();
  const editable = canManageGenres(role);
  const [editing, setEditing] = useState<string | null>(null); // "m:<id>" | "s:<id>" | "r:<id>"
  const [newMajor, setNewMajor] = useState("");
  const [newSub, setNewSub] = useState<Record<string, string>>({});
  const [newRound, setNewRound] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const [delText, setDelText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const isOwner = !!user && set.ownerId === user.uid;

  async function handleDeleteSet() {
    if (!isOwner || delText !== "削除" || deleting) return;
    setDeleting(true);
    setError("");
    try {
      await deleteQuestionSet(set.id);
      router.push("/dashboard");
    } catch (e: any) {
      console.error(e);
      setError(e?.code === "permission-denied" ? "セットを削除する権限がありません（オーナーのみ）" : "削除に失敗しました。途中まで削除されている可能性があるので、もう一度お試しください");
      setDeleting(false);
    }
  }

  // 使用数（ゴミ箱の問題も数える：復元したときに参照が壊れないように）
  const usage = useMemo(() => {
    const major = new Map<string, number>();
    const sub = new Map<string, number>();
    const round = new Map<string, number>();
    for (const q of all) {
      if (q.genreId) major.set(q.genreId, (major.get(q.genreId) ?? 0) + 1);
      if (q.subGenreId) sub.set(`${q.genreId}/${q.subGenreId}`, (sub.get(`${q.genreId}/${q.subGenreId}`) ?? 0) + 1);
      if (q.roundId) round.set(q.roundId, (round.get(q.roundId) ?? 0) + 1);
    }
    return { major, sub, round };
  }, [all]);

  async function saveTree(next: GenreNode[]) {
    setBusy(true);
    setError("");
    try {
      await actions.saveGenreTree(next);
      setEditing(null);
    } catch (e: any) {
      console.error(e);
      setError(e?.code === "permission-denied" ? "ジャンルを変更する権限がありません" : "保存に失敗しました");
    } finally {
      setBusy(false);
    }
  }
  async function saveRounds(next: Round[]) {
    setBusy(true);
    setError("");
    try {
      await actions.saveRounds(next);
      setEditing(null);
    } catch (e: any) {
      console.error(e);
      setError(e?.code === "permission-denied" ? "Roundを変更する権限がありません" : "保存に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  const dupName = (names: string[], n: string, except?: string) => names.some((x) => x !== except && x.trim().toLowerCase() === n.trim().toLowerCase());

  function addMajor() {
    const n = newMajor.trim();
    if (!n) return;
    if (dupName(tree.map((g) => g.name), n)) return setError(`大ジャンル「${n}」は既に存在します`);
    saveTree([...tree, { id: newId("g"), name: n, subs: [] }]).then(() => setNewMajor(""));
  }
  function renameMajor(id: string, name: string) {
    const n = name.trim();
    if (!n) return setEditing(null);
    if (dupName(tree.map((g) => g.name), n, tree.find((g) => g.id === id)?.name)) return setError(`大ジャンル「${n}」は既に存在します`);
    saveTree(tree.map((g) => (g.id === id ? { ...g, name: n } : g))); // IDは不変なので問題側のデータは書き換え不要
  }
  function deleteMajor(g: GenreNode) {
    const used = usage.major.get(g.id) ?? 0;
    if (used > 0) return setError(`「${g.name}」は${used}問（ゴミ箱を含む）で使われているため削除できません。先に問題のジャンルを変更してください`);
    if (confirm(`大ジャンル「${g.name}」と、その小ジャンルを削除しますか？`)) saveTree(tree.filter((x) => x.id !== g.id));
  }
  function addSub(g: GenreNode) {
    const n = (newSub[g.id] ?? "").trim();
    if (!n) return;
    if (dupName(g.subs.map((s) => s.name), n)) return setError(`小ジャンル「${n}」は「${g.name}」に既に存在します`);
    saveTree(tree.map((x) => (x.id === g.id ? { ...x, subs: [...x.subs, { id: newId("s"), name: n }] } : x))).then(() => setNewSub((m) => ({ ...m, [g.id]: "" })));
  }
  function renameSub(g: GenreNode, sid: string, name: string) {
    const n = name.trim();
    if (!n) return setEditing(null);
    if (dupName(g.subs.map((s) => s.name), n, g.subs.find((s) => s.id === sid)?.name)) return setError(`小ジャンル「${n}」は既に存在します`);
    saveTree(tree.map((x) => (x.id === g.id ? { ...x, subs: x.subs.map((s) => (s.id === sid ? { ...s, name: n } : s)) } : x)));
  }
  function deleteSub(g: GenreNode, sid: string, name: string) {
    const used = usage.sub.get(`${g.id}/${sid}`) ?? 0;
    if (used > 0) return setError(`「${name}」は${used}問（ゴミ箱を含む）で使われているため削除できません`);
    if (confirm(`小ジャンル「${name}」を削除しますか？`)) saveTree(tree.map((x) => (x.id === g.id ? { ...x, subs: x.subs.filter((s) => s.id !== sid) } : x)));
  }

  function addRound() {
    const n = newRound.trim();
    if (!n) return;
    if (dupName(set.rounds.map((r) => r.name), n)) return setError(`Round「${n}」は既に存在します`);
    saveRounds([...set.rounds, { id: newId("r"), name: n }]).then(() => setNewRound(""));
  }
  function renameRound(id: string, name: string) {
    const n = name.trim();
    if (!n) return setEditing(null);
    if (dupName(set.rounds.map((r) => r.name), n, set.rounds.find((r) => r.id === id)?.name)) return setError(`Round「${n}」は既に存在します`);
    saveRounds(set.rounds.map((r) => (r.id === id ? { ...r, name: n } : r)));
  }
  function deleteRound(r: Round) {
    const used = usage.round.get(r.id) ?? 0;
    if (used > 0) return setError(`「${r.name}」は${used}問で使われているため削除できません。先に問題のRoundを変更してください`);
    if (confirm(`Round「${r.name}」を削除しますか？`)) saveRounds(set.rounds.filter((x) => x.id !== r.id));
  }

  const iconBtn = "rounded p-1 text-slate-300 hover:bg-slate-50 hover:text-slate-500 disabled:opacity-40";

  return (
    <div className="mx-auto max-w-2xl">
      {!editable && <p className="mb-4 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-500">ジャンルとRoundの編集は管理者・問題統括のみ行えます。</p>}
      {error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}

      <section className={card}>
        <h2 className="mb-1 text-sm font-medium text-slate-600">ジャンル（大ジャンル → 小ジャンル）</h2>
        <p className="mb-3 text-xs text-slate-400">名前を変更しても既存の問題は自動的に新しい名前で表示されます。使用中のジャンルは削除できません。</p>
        {tree.length === 0 && <p className="mb-3 text-sm text-slate-300">まだジャンルがありません</p>}
        <div className="space-y-3">
          {tree.map((g) => (
            <div key={g.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center gap-2">
                {editing === `m:${g.id}` ? (
                  <InlineName value={g.name} onSave={(v) => renameMajor(g.id, v)} onCancel={() => setEditing(null)} />
                ) : (
                  <>
                    <span className="flex-1 font-medium text-slate-700">{g.name}<span className="ml-2 text-xs font-normal text-slate-300">{usage.major.get(g.id) ?? 0}問</span></span>
                    {editable && <><button disabled={busy} onClick={() => setEditing(`m:${g.id}`)} aria-label="名前を変更" className={iconBtn}><Pencil size={14} /></button>
                    <button disabled={busy} onClick={() => deleteMajor(g)} aria-label="削除" className={iconBtn}><Trash2 size={14} /></button></>}
                  </>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {g.subs.map((s) =>
                  editing === `s:${g.id}/${s.id}` ? (
                    <span key={s.id} className="flex w-full"><InlineName value={s.name} onSave={(v) => renameSub(g, s.id, v)} onCancel={() => setEditing(null)} /></span>
                  ) : (
                    <span key={s.id} className="flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs text-brand-600">
                      {s.name}<span className="text-brand-400">{usage.sub.get(`${g.id}/${s.id}`) ?? 0}</span>
                      {editable && <><button disabled={busy} onClick={() => setEditing(`s:${g.id}/${s.id}`)} aria-label="名前を変更" className="text-brand-400 hover:text-brand-600"><Pencil size={11} /></button>
                      <button disabled={busy} onClick={() => deleteSub(g, s.id, s.name)} aria-label="削除" className="text-brand-400 hover:text-rose-500"><X size={12} /></button></>}
                    </span>
                  )
                )}
                {g.subs.length === 0 && <span className="text-xs text-slate-300">小ジャンルなし</span>}
              </div>
              {editable && (
                <div className="mt-2 flex gap-2">
                  <input value={newSub[g.id] ?? ""} onChange={(e) => setNewSub((m) => ({ ...m, [g.id]: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addSub(g)} placeholder="小ジャンルを追加（例：数学I）" className={inputCls} />
                  <button disabled={busy} onClick={() => addSub(g)} className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 text-sm text-white hover:bg-brand-700 disabled:opacity-50"><Plus size={14} />追加</button>
                </div>
              )}
            </div>
          ))}
        </div>
        {editable && (
          <div className="mt-3 flex gap-2">
            <input value={newMajor} onChange={(e) => setNewMajor(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addMajor()} placeholder="大ジャンルを追加（例：数学）" className={inputCls} />
            <button disabled={busy} onClick={addMajor} className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 text-sm text-white hover:bg-brand-700 disabled:opacity-50"><Plus size={14} />追加</button>
          </div>
        )}
      </section>

      <section className={card}>
        <h2 className="mb-1 text-sm font-medium text-slate-600">Round</h2>
        <p className="mb-3 text-xs text-slate-400">採用した問題をどのRoundで使うかを指定します。出題順ルールは「出題順」タブでRoundごとに設定できます。</p>
        <div className="mb-3 space-y-1.5">
          {set.rounds.length === 0 && <p className="text-sm text-slate-300">まだRoundがありません</p>}
          {set.rounds.map((r) => (
            <div key={r.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
              {editing === `r:${r.id}` ? (
                <InlineName value={r.name} onSave={(v) => renameRound(r.id, v)} onCancel={() => setEditing(null)} />
              ) : (
                <>
                  <span className="flex-1 text-slate-700">{r.name}<span className="ml-2 text-xs text-slate-300">{usage.round.get(r.id) ?? 0}問</span></span>
                  {editable && <><button disabled={busy} onClick={() => setEditing(`r:${r.id}`)} aria-label="名前を変更" className={iconBtn}><Pencil size={14} /></button>
                  <button disabled={busy} onClick={() => deleteRound(r)} aria-label="削除" className={iconBtn}><Trash2 size={14} /></button></>}
                </>
              )}
            </div>
          ))}
        </div>
        {editable && (
          <div className="flex gap-2">
            <input value={newRound} onChange={(e) => setNewRound(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addRound()} placeholder="Roundを追加（例：Round 1）" className={inputCls} />
            <button disabled={busy} onClick={addRound} className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 text-sm text-white hover:bg-brand-700 disabled:opacity-50"><Plus size={14} />追加</button>
          </div>
        )}
      </section>

      {isOwner && (
        <section className="mb-5 rounded-2xl border border-rose-200 bg-white p-5">
          <h2 className="mb-1 text-sm font-medium text-rose-600">問題セットの削除</h2>
          <p className="mb-3 text-xs text-slate-400">このセットと、中のすべての問題を完全に削除します。元に戻せません。招待中のユーザーがいる場合は、先にメンバー画面で招待を解除してください。</p>
          <div className="flex gap-2">
            <input value={delText} onChange={(e) => setDelText(e.target.value)} placeholder="確認のため「削除」と入力" className={inputCls} />
            <button disabled={delText !== "削除" || deleting} onClick={handleDeleteSet} className="rounded-lg bg-rose-600 px-3 text-sm text-white hover:bg-rose-700 disabled:opacity-40">{deleting ? "削除中…" : "セットを削除"}</button>
          </div>
        </section>
      )}
    </div>
  );
}
