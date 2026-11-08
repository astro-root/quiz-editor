"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Plus, FolderOpen, UserCog, X, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/auth-context";
import { useQuestionSets } from "@/lib/useQuestionSets";
import { acceptLegacyInvite, acceptUserInvite, declineUserInvite, useMyInvites } from "@/lib/useInvites";
import { roleLabel } from "@/lib/permissions";
import { Avatar } from "@/components/Avatar";
import { Modal } from "@/components/Modal";
import { Fab } from "@/components/Fab";
import { LinkGoogleBanner } from "@/components/LinkGoogleBanner";

export default function DashboardPage() {
  const { user, loading, logOut } = useAuth();
  const router = useRouter();
  const { sets, loading: setsLoading, createQuestionSet } = useQuestionSets();
  const { invites, legacy } = useMyInvites();
  const [showNew, setShowNew] = useState(false);
  const [newSetName, setNewSetName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading || !user) return null;
  const me = { uid: user.uid, email: user.email ?? "", displayName: user.displayName ?? "", photoURL: user.photoURL ?? "" };

  function openNew() {
    setCreateError("");
    setShowNew(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = newSetName.trim();
    if (!name || creating) return;
    setCreateError("");
    setCreating(true);
    try {
      const id = await createQuestionSet(name);
      setNewSetName("");
      setShowNew(false);
      router.push(`/sets/${id}`);
    } catch (err) {
      console.error(err);
      setCreateError("問題セットを作成できませんでした。もう一度お試しください");
    } finally {
      setCreating(false);
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

  const newBtn = "flex min-h-[40px] items-center gap-1.5 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-brand-700";

  return (
    <div className="min-h-dvh bg-slate-50">
      <div className="mx-auto max-w-[96rem] px-4 py-8 sm:px-6 lg:px-10">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size={32} />
            <h1 className="text-lg font-semibold text-slate-800">Qraft</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/account" aria-label="アカウント設定" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
              <Avatar name={me.displayName || me.email} photoURL={me.photoURL} size={22} /><UserCog size={14} />
            </Link>
            <button onClick={logOut} className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600"><LogOut size={14} />ログアウト</button>
          </div>
        </div>

        <LinkGoogleBanner />
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

        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-slate-500">問題セット</h2>
          <button onClick={openNew} className={`${newBtn} hidden sm:flex`}><Plus size={16} />新規</button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {sets.map((s) => (
            <Link key={s.id} href={`/sets/${s.id}`} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-surface p-4 shadow-sm transition hover:border-brand-300 hover:shadow-pop">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><FolderOpen size={16} /></div>
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-800">{s.name}</p>
                <p className="text-xs text-slate-400">{s.ownerId === user.uid ? "自分が所有" : "共有されている"}・{roleLabel[s.members[user.uid]] ?? ""}</p>
              </div>
            </Link>
          ))}
          {!setsLoading && sets.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-slate-200 bg-surface px-6 py-10 text-center">
              <p className="mb-4 text-sm text-slate-400">まだ問題セットがありません。</p>
              <button onClick={openNew} className={`${newBtn} mx-auto`}><Plus size={16} />最初の問題セットを作る</button>
            </div>
          )}
        </div>
      </div>

      {showNew && (
        <Modal onRequestClose={() => setShowNew(false)} label="新しい問題セット" size="md">
          <form onSubmit={handleCreate} className="p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-accent">新しい問題セット</span>
              <button type="button" onClick={() => setShowNew(false)} aria-label="閉じる" className="-mr-1 flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
            </div>
            <label htmlFor="new-set-name" className="mb-1 block text-xs text-slate-400">名前</label>
            <input
              id="new-set-name"
              value={newSetName}
              onChange={(e) => setNewSetName(e.target.value)}
              placeholder="例：第10回○○高校クイズ大会"
              maxLength={80}
              autoFocus
              className="mb-1 w-full rounded-lg border border-slate-200 bg-surface p-3 text-base text-slate-700 placeholder:text-slate-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
            <p className="mb-4 text-[11px] text-slate-400">メンバーの招待は、作成したあとに行えます。</p>
            {createError && <p role="alert" className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-danger">{createError}</p>}
            <div className="flex items-center gap-2">
              <button type="submit" disabled={!newSetName.trim() || creating} className="flex min-h-[44px] items-center gap-1.5 rounded-lg bg-brand-600 px-5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40">
                {creating && <Loader2 size={14} className="animate-spin" />}作成
              </button>
              <button type="button" onClick={() => setShowNew(false)} className="min-h-[44px] rounded-lg border border-slate-200 px-4 text-sm text-slate-600 hover:bg-slate-50">キャンセル</button>
            </div>
          </form>
        </Modal>
      )}

      {!showNew && <Fab onClick={openNew} label="新しい問題セットを作る" />}
    </div>
  );
}
