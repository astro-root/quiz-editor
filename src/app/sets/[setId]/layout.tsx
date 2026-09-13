"use client";

import { useEffect } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, PencilLine, LayoutGrid, Stamp, Users2, Megaphone } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useQuestionSet } from "@/lib/useQuestionSets";
import { SetProvider, useSetContext } from "@/lib/SetContext";
import { canManageMembers } from "@/lib/permissions";
import { ShareDialog } from "@/components/ShareDialog";
import { useState } from "react";

const tabs = [
  { href: "", label: "お知らせ", icon: Megaphone },
  { href: "/write", label: "作問", icon: PencilLine },
  { href: "/manage", label: "管理", icon: LayoutGrid },
  { href: "/adopted", label: "採用", icon: Stamp },
];

function SetShell({ children }: { children: React.ReactNode }) {
  const { set, role } = useSetContext();
  const pathname = usePathname();
  const [showShare, setShowShare] = useState(false);
  const base = `/sets/${set.id}`;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-6 pb-16 pt-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <Link href="/dashboard" className="mb-1 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600">
              <ArrowLeft size={12} /> 一覧へ戻る
            </Link>
            <h1 className="text-lg font-semibold text-slate-800">{set.name}</h1>
          </div>
          {canManageMembers(role) && (
            <button
              onClick={() => setShowShare(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 shadow-sm hover:border-brand-300 hover:text-brand-600"
            >
              <Users2 size={15} />
              共有
            </button>
          )}
        </div>

        <div className="mb-5 inline-flex rounded-xl bg-slate-100 p-1">
          {tabs.map((t) => {
            const href = base + t.href;
            const active = pathname === href;
            return (
              <Link
                key={t.href}
                href={href}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                  active ? "bg-white text-brand-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <t.icon size={15} />
                {t.label}
              </Link>
            );
          })}
        </div>

        {children}

        {showShare && (
          <ShareDialog set={set} isAdmin={canManageMembers(role)} onClose={() => setShowShare(false)} />
        )}
      </div>
    </div>
  );
}

export default function SetLayout({ children }: { children: React.ReactNode }) {
  const { setId } = useParams<{ setId: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { set, loading: setLoading, addGenre, updateNotice } = useQuestionSet(setId);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  if (authLoading || setLoading || !user) return null;

  if (!set) {
    return <div className="p-6 text-center text-sm text-slate-500">問題セットが見つかりません。</div>;
  }
  if (!set.members[user.uid]) {
    return <div className="p-6 text-center text-sm text-slate-500">この問題セットへのアクセス権がありません。</div>;
  }

  return (
    <SetProvider set={set} addGenre={addGenre} updateNotice={updateNotice}>
      <SetShell>{children}</SetShell>
    </SetProvider>
  );
}
