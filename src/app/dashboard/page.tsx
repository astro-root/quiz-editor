"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
    await acceptInvite(invite.setId, user.uid, invite.role, user.email);
    setAccepting(false);
    router.push(`/sets/${invite.setId}`);
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">問題セット一覧</h1>
        <button
          onClick={logOut}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ログアウト
        </button>
      </div>

      {!inviteLoading && invite && (
        <div className="mb-6 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
          <span>
            「{invite.setName}」への招待があります（
            {invite.role === "editor" ? "編集者" : "閲覧者"}）
          </span>
          <button
            onClick={handleAcceptInvite}
            disabled={accepting}
            className="rounded-lg bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
          >
            参加する
          </button>
        </div>
      )}

      <form onSubmit={handleCreate} className="mb-6 flex gap-2">
        <input
          value={newSetName}
          onChange={(e) => setNewSetName(e.target.value)}
          placeholder="新しい問題セット名（例：第10回○○高校クイズ大会）"
          className="flex-1 rounded-lg border border-gray-200 p-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
        >
          作成
        </button>
      </form>

      <div className="space-y-2">
        {sets.map((s) => (
          <Link
            key={s.id}
            href={`/sets/${s.id}`}
            className="block rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300"
          >
            <p className="font-medium">{s.name}</p>
            <p className="text-xs text-gray-400">
              {s.ownerId === user.uid ? "自分が所有" : "共有されている"}
            </p>
          </Link>
        ))}
        {sets.length === 0 && (
          <p className="p-4 text-center text-sm text-gray-400">
            まだ問題セットがありません
          </p>
        )}
      </div>
    </div>
  );
}
