"use client";

import { useEffect, useRef, useState } from "react";
import { X, Search, Clock, Trash2, Check, Loader2 } from "lucide-react";
import { PublicProfile, QuestionSet, Role, ALL_ROLES } from "@/lib/types";
import { roleLabel, roleDescription } from "@/lib/permissions";
import { cancelUserInvite, inviteUser, searchUsers, usePendingInvites } from "@/lib/useInvites";
import { useAuth } from "@/lib/auth-context";
import { useSetContext } from "@/lib/SetContext";
import { Avatar } from "./Avatar";

export function ShareDialog({ set, isAdmin, onClose }: { set: QuestionSet; isAdmin: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const { actions, personOf } = useSetContext();
  const pending = usePendingInvites(set.id, isAdmin);
  const [text, setText] = useState("");
  const [results, setResults] = useState<PublicProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<PublicProfile | null>(null);
  const [role, setRole] = useState<Role>("writer");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const seq = useRef(0);

  // 入力のたびに検索するが、古い応答が新しい結果を上書きしないよう連番で破棄する
  useEffect(() => {
    if (!text.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }
    const my = ++seq.current;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const r = await searchUsers(text);
        if (my === seq.current) setResults(r);
      } catch (e) {
        console.error(e);
        if (my === seq.current) setMsg({ ok: false, text: "ユーザー検索に失敗しました" });
      } finally {
        if (my === seq.current) setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [text]);

  const pendingUids = new Set(pending.map((p) => p.uid));
  function status(u: PublicProfile): string {
    if (u.uid === user?.uid) return "自分";
    if (set.members[u.uid]) return "メンバー";
    if (pendingUids.has(u.uid)) return "招待済み";
    return "";
  }

  async function handleInvite() {
    if (!user || !selected) return;
    setBusy(true);
    setMsg(null);
    try {
      await inviteUser(set, { uid: user.uid, name: user.displayName || "" }, selected, role);
      setMsg({ ok: true, text: `${selected.displayName} さんを招待しました` });
      setSelected(null);
      setText("");
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message?.includes("permission") ? "権限がありません" : e?.message || "招待に失敗しました" });
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(uid: string, r: Role) {
    try {
      await actions.updateMembers({ [`members.${uid}`]: r });
    } catch (e) {
      console.error(e);
      setMsg({ ok: false, text: "権限の変更に失敗しました" });
    }
  }
  async function removeMember(uid: string) {
    const p = personOf(uid);
    if (!confirm(`${p.name} さんをこの問題セットから外しますか？（作成した問題は残ります）`)) return;
    try {
      const members = { ...set.members };
      const profiles = { ...set.memberProfiles };
      delete members[uid];
      delete profiles[uid];
      await actions.updateMembers({ members, memberProfiles: profiles });
    } catch (e) {
      console.error(e);
      setMsg({ ok: false, text: "メンバーの削除に失敗しました" });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">メンバーと権限</h2>
          <button onClick={onClose} aria-label="閉じる" className="rounded-full p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>

        {isAdmin && (
          <div className="mb-5">
            <p className="mb-1.5 text-xs font-medium text-slate-400">ユーザーを招待</p>
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={text}
                onChange={(e) => { setText(e.target.value); setSelected(null); setMsg(null); }}
                placeholder="表示名でユーザーを検索"
                autoFocus
                className="w-full rounded-lg border border-slate-200 p-2 pl-9 text-sm focus:border-brand-400 focus:outline-none"
              />
              {searching && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-300" />}
            </div>

            {text.trim() && !searching && results.length === 0 && (
              <p className="mt-2 text-xs text-slate-400">該当するユーザーが見つかりません（相手が一度ログインしている必要があります）</p>
            )}
            {results.length > 0 && (
              <ul className="mt-2 max-h-52 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
                {results.map((u) => {
                  const st = status(u);
                  const isSel = selected?.uid === u.uid;
                  return (
                    <li key={u.uid}>
                      <button
                        type="button"
                        disabled={!!st}
                        onClick={() => setSelected(u)}
                        className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm ${isSel ? "bg-brand-50" : "hover:bg-slate-50"} disabled:opacity-50`}
                      >
                        <Avatar name={u.displayName} photoURL={u.photoURL} size={28} />
                        <span className="min-w-0 flex-1 truncate text-slate-700">{u.displayName}</span>
                        {st && <span className="text-xs text-slate-400">{st}</span>}
                        {isSel && <Check size={15} className="text-brand-600" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {selected && (
              <div className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3">
                <p className="flex items-center gap-2 text-sm text-slate-700">
                  <Avatar name={selected.displayName} photoURL={selected.photoURL} size={22} />
                  {selected.displayName} さんを招待
                </p>
                <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm">
                  {ALL_ROLES.map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}
                </select>
                <p className="text-xs text-slate-400">{roleDescription[role]}</p>
                <button onClick={handleInvite} disabled={busy} className="w-full rounded-lg bg-brand-600 p-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
                  {busy ? "招待中…" : "招待する"}
                </button>
              </div>
            )}
            {msg && <p className={`mt-2 text-xs ${msg.ok ? "text-emerald-600" : "text-rose-500"}`}>{msg.text}</p>}
          </div>
        )}

        {isAdmin && pending.length > 0 && (
          <>
            <p className="mb-1.5 text-xs font-medium text-slate-400">招待中</p>
            <div className="mb-5 space-y-1.5">
              {pending.map((p) => (
                <div key={p.uid} className="flex items-center justify-between rounded-lg border border-dashed border-amber-200 bg-amber-50 px-3 py-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2 text-slate-600">
                    <Avatar name={p.displayName} photoURL={p.photoURL} size={22} />
                    <span className="truncate">{p.displayName || "（名前なし）"}</span>
                    <Clock size={12} className="shrink-0 text-amber-500" />
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
                    {roleLabel[p.role]}
                    <button onClick={() => cancelUserInvite(set.id, p.uid).catch(() => setMsg({ ok: false, text: "招待の解除に失敗しました" }))} aria-label="招待を解除" className="text-slate-400 hover:text-rose-500">
                      <Trash2 size={13} />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        <p className="mb-1.5 text-xs font-medium text-slate-400">メンバー（{Object.keys(set.members).length}）</p>
        <div className="space-y-1.5">
          {Object.entries(set.members).map(([uid, r]) => {
            const p = personOf(uid);
            const isOwner = uid === set.ownerId;
            return (
              <div key={uid} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="flex min-w-0 items-center gap-2 text-slate-700">
                  <Avatar name={p.name} photoURL={p.photoURL} size={24} />
                  <span className="truncate">{p.name}{uid === user?.uid && "（自分）"}</span>
                  {isOwner && <span className="shrink-0 rounded bg-amber-100 px-1.5 text-[10px] text-amber-700">オーナー</span>}
                </span>
                {isAdmin && !isOwner ? (
                  <span className="flex shrink-0 items-center gap-1.5">
                    <select value={r} onChange={(e) => changeRole(uid, e.target.value as Role)} className="rounded border border-slate-200 bg-white px-1 py-0.5 text-xs">
                      {ALL_ROLES.map((x) => <option key={x} value={x}>{roleLabel[x]}</option>)}
                    </select>
                    <button onClick={() => removeMember(uid)} aria-label="メンバーを外す" className="text-slate-400 hover:text-rose-500"><Trash2 size={13} /></button>
                  </span>
                ) : (
                  <span className="shrink-0 text-xs text-slate-500">{roleLabel[r as Role] ?? r}</span>
                )}
              </div>
            );
          })}
        </div>
        {!isAdmin && <p className="mt-4 text-xs text-slate-400">メンバーの招待・権限変更は管理者のみ行えます</p>}
      </div>
    </div>
  );
}
