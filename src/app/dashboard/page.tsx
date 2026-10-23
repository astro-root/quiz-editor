"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Plus, FolderOpen, Sparkles, UserCog } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useQuestionSets } from "@/lib/useQuestionSets";
import { acceptLegacyInvite, acceptUserInvite, declineUserInvite, useMyInvites } from "@/lib/useInvites";
import { roleLabel } from "@/lib/permissions";
import { Avatar } from "@/components/Avatar";

export default function DashboardPage() {
  const { user, loading, logOut } = useAuth();
  const router = useRouter();
  const { sets, loading: setsLoading, createQuestionSet } = useQuestionSets();
  const { invites, legacy } = useMyInvites();
  const [newSetName, setNewSetName] = useState("");
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading || !user) return null;
  const me = { uid: user.uid, email: user.email ?? "", displayName: user.displayName ?? "", photoURL: user.photoURL ?? "" };

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newSetName.trim()) return;
    setError("");
    try {
      const id = await createQuestionSet(newSetName.trim());
      setNewSetName("");
      router.push(`/sets/${id}`);
    } catch (err) {
      console.error(err);
      setError("問題セットを作成できませんでした");
    }
  }

  async function accept(id: string, fn: () => Promise<void>, setId: string) {
    setBusyId(id);
    setError("");
    try {
      await fn();
      router.push(`/sets/${setId}`);
    } catch (err) {
      console.error("招待の承諾に失敗しました", err);
      setError("招待を承諾できませんでした。招待が取り消されたか、権限が変更された可能性があります");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-sky-400 text-white shadow-sm"><Sparkles size={16} /></div>
            <h1 className="text-lg font-semibold text-slate-800">Qraft</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/account" aria-label="アカウント設定" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
              <Avatar name={me.displayName || me.email} photoURL={me.photoURL} size={22} /><UserCog size={14} />
            </Link>
            <button onClick={logOut} className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600"><LogOut size={14} />ログアウト</button>
          </div>
        </div>

        {error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-danger">{error}</p>}

        {invites.map((inv) => (
          <div key={inv.id} className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm">
            <span className="text-slate-700">{inv.inviterName && `${inv.inviterName}さんから`}「{inv.setName}」への招待（{roleLabel[inv.role] ?? inv.role}）</span>
            <span className="flex gap-2">
              <button onClick={() => declineUserInvite(inv).catch(() => setError("辞退に失敗しました"))} disabled={busyId === inv.id} className="rounded-lg border border-slate-200 bg-surface px-3 py-1.5 text-slate-500 hover:bg-slate-50">辞退</button>
              <button onClick={() => accept(inv.id, () => acceptUserInvite(inv, me), inv.setId)} disabled={busyId === inv.id} className="rounded-lg bg-brand-600 px-3 py-1.5 text-white shadow-sm hover:bg-brand-700 disabled:opacity-50">参加する</button>
            </span>
          </div>
        ))}
        {legacy && (
          <div className="mb-3 flex items-center justify-between rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm">
            <span className="text-slate-700">「{legacy.setName}」への招待があります（{roleLabel[legacy.role] ?? legacy.role}）</span>
            <button onClick={() => accept("legacy", () => acceptLegacyInvite(legacy, me), legacy.setId)} disabled={busyId === "legacy"} className="rounded-lg bg-brand-600 px-3 py-1.5 text-white shadow-sm hover:bg-brand-700 disabled:opacity-50">参加する</button>
          </div>
        )}

        <form onSubmit={handleCreate} className="mb-8 flex gap-2">
          <input value={newSetName} onChange={(e) => setNewSetName(e.target.value)} placeholder="新しい問題セット名（例：第10回○○高校クイズ大会）" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-surface p-3 text-sm shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100" />
          <button type="submit" className="flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-brand-700"><Plus size={16} />作成</button>
        </form>

        <div className="space-y-2">
          {sets.map((s) => (
            <Link key={s.id} href={`/sets/${s.id}`} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-surface p-4 shadow-sm transition hover:border-brand-300 hover:shadow-pop">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><FolderOpen size={16} /></div>
              <div>
                <p className="font-medium text-slate-800">{s.name}</p>
                <p className="text-xs text-slate-400">{s.ownerId === user.uid ? "自分が所有" : "共有されている"}・{roleLabel[s.members[user.uid]] ?? ""}</p>
              </div>
            </Link>
          ))}
          {!setsLoading && sets.length === 0 && <p className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">まだ問題セットがありません</p>}
        </div>
      </div>
    </div>
  );
}
