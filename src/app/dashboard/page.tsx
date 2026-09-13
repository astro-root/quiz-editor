"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Plus, Stamp } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useQuestionSets } from "@/lib/useQuestionSets";
import { acceptInvite, useMyInvite } from "@/lib/useInvites";

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
    <div className="min-h-screen bg-paper">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="mb-10 flex items-end justify-between border-b border-kraft-dark pb-4">
          <div className="flex items-center gap-2">
            <Stamp size={20} className="text-stamp" />
            <h1 className="font-mincho text-2xl tracking-wide text-ink">Qraft</h1>
          </div>
          <button
            onClick={logOut}
            className="flex items-center gap-1 text-sm text-ink-faint hover:text-ink"
          >
            <LogOut size={14} />
            ログアウト
          </button>
        </div>

        {!inviteLoading && invite && (
          <div className="mb-6 flex items-center justify-between rounded-lg border border-kraft-dark bg-moss-soft p-4 text-sm">
            <span className="text-ink">
              「{invite.setName}」への招待があります（
              {invite.role === "editor" ? "編集者" : "閲覧者"}）
            </span>
            <button
              onClick={handleAcceptInvite}
              disabled={accepting}
              className="rounded-md bg-moss px-3 py-1.5 text-white hover:opacity-90 disabled:opacity-50"
            >
              参加する
            </button>
          </div>
        )}

        <form onSubmit={handleCreate} className="mb-10 flex gap-2">
          <input
            value={newSetName}
            onChange={(e) => setNewSetName(e.target.value)}
            placeholder="新しい問題セット名（例：第10回○○高校クイズ大会）"
            className="flex-1 rounded-md border border-kraft-line bg-card p-3 text-sm text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none"
          />
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-md bg-ink px-4 text-sm font-medium text-white hover:opacity-90"
          >
            <Plus size={16} />
            作成
          </button>
        </form>

        <p className="mb-2 font-mincho text-sm text-ink-soft">問題セット</p>
        <div className="divide-y divide-kraft-line rounded-lg border border-kraft-line bg-card">
          {sets.map((s) => (
            <Link
              key={s.id}
              href={`/sets/${s.id}`}
              className="flex items-center justify-between p-4 transition hover:bg-kraft/20"
            >
              <div>
                <p className="font-medium text-ink">{s.name}</p>
                <p className="text-xs text-ink-faint">
                  {s.ownerId === user.uid ? "自分が所有" : "共有されている"}
                </p>
              </div>
            </Link>
          ))}
          {sets.length === 0 && (
            <p className="p-10 text-center text-sm text-ink-faint">
              まだ問題セットがありません
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
