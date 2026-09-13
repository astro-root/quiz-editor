"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Plus, FolderOpen, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useQuestionSets } from "@/lib/useQuestionSets";
import { acceptInvite, useMyInvite } from "@/lib/useInvites";
import { roleLabel } from "@/lib/permissions";

export default function DashboardPage() {
  const { user, loading, logOut } = useAuth();
  const router = useRouter();
  const { sets, createQuestionSet } = useQuestionSets();
  const { invite, loading: inviteLoading } = useMyInvite();
  const [newSetName, setNewSetName] = useState("");
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading || !user) return null;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newSetName.trim()) return;
    const id = await createQuestionSet(newSetName.trim());
    setNewSetName("");
    router.push(`/sets/${id}`);
  }

  async function handleAcceptInvite() {
    if (!invite || !user?.email) return;
    setAccepting(true);
    await acceptInvite(
      invite.setId,
      user.uid,
      invite.role,
      user.email,
      user.displayName ?? ""
    );
    setAccepting(false);
    router.push(`/sets/${invite.setId}`);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-sky-400 text-white shadow-sm">
              <Sparkles size={16} />
            </div>
            <h1 className="text-lg font-semibold text-slate-800">Qraft</h1>
          </div>
          <button
            onClick={logOut}
            className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600"
          >
            <LogOut size={14} />
            ログアウト
          </button>
        </div>

        {!inviteLoading && invite && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm">
            <span className="text-slate-700">
              「{invite.setName}」への招待があります（
              {roleLabel[invite.role]}）
            </span>
            <button
              onClick={handleAcceptInvite}
              disabled={accepting}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
            >
              参加する
            </button>
          </div>
        )}

        <form onSubmit={handleCreate} className="mb-8 flex gap-2">
          <input
            value={newSetName}
            onChange={(e) => setNewSetName(e.target.value)}
            placeholder="新しい問題セット名（例：第10回○○高校クイズ大会）"
            className="flex-1 rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
          >
            <Plus size={16} />
            作成
          </button>
        </form>

        <div className="space-y-2">
          {sets.map((s) => (
            <Link
              key={s.id}
              href={`/sets/${s.id}`}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-300 hover:shadow-pop"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                <FolderOpen size={16} />
              </div>
              <div>
                <p className="font-medium text-slate-800">{s.name}</p>
                <p className="text-xs text-slate-400">
                  {s.ownerId === user.uid ? "自分が所有" : "共有されている"}
                </p>
              </div>
            </Link>
          ))}
          {sets.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
              まだ問題セットがありません
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
