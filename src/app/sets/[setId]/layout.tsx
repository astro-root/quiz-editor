"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, PencilLine, ListChecks, ShieldCheck, ListOrdered, Trash2, Users2, Megaphone, ArrowUpDown, Settings, Printer } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useQuestionSet } from "@/lib/useQuestionSets";
import { SetProvider, useSetContext } from "@/lib/SetContext";
import { QuestionsProvider, useQuestionStore } from "@/lib/QuestionsContext";
import { canManageMembers } from "@/lib/permissions";
import { ShareDialog } from "@/components/ShareDialog";

const tabs = [
  { href: "", label: "お知らせ", icon: Megaphone, match: [""] },
  { href: "/write", label: "作問", icon: PencilLine, match: ["/write"] },
  { href: "/manage", label: "問題", icon: ListChecks, match: ["/manage", "/mine", "/others"] },
  { href: "/proofread", label: "裏どり", icon: ShieldCheck, match: ["/proofread"] },
  { href: "/adopted", label: "出題順", icon: ListOrdered, match: ["/adopted"] },
  { href: "/trash", label: "ゴミ箱", icon: Trash2, match: ["/trash"] },
  { href: "/members", label: "メンバー", icon: Users2, match: ["/members"] },
  { href: "/io", label: "入出力", icon: ArrowUpDown, match: ["/io"] },
  { href: "/print", label: "印刷", icon: Printer, match: ["/print"] },
  { href: "/settings", label: "設定", icon: Settings, match: ["/settings"] },
];

function SetShell({ children }: { children: React.ReactNode }) {
  const { set, role } = useSetContext();
  const store = useQuestionStore();
  const pathname = usePathname();
  const [showShare, setShowShare] = useState(false);
  const base = `/sets/${set.id}`;
  const rel = pathname.startsWith(base) ? pathname.slice(base.length) : "";

  return (
    <div className="min-h-screen bg-slate-50 print:min-h-0 print:bg-surface">
      <div className="mx-auto max-w-4xl px-3 pb-16 pt-4 sm:px-6 sm:pt-6 print:max-w-none print:p-0">
        <div className="mb-4 flex items-center justify-between gap-2 print:hidden">
          <div className="min-w-0">
            <Link href="/dashboard" className="mb-1 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600">
              <ArrowLeft size={12} /> 一覧へ戻る
            </Link>
            <h1 className="truncate text-lg font-semibold text-slate-800">{set.name}</h1>
          </div>
          <button onClick={() => setShowShare(true)} className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-surface px-3 py-1.5 text-sm text-slate-600 shadow-sm hover:border-brand-300 hover:text-accent">
            <Users2 size={15} />
            {canManageMembers(role) ? "招待・権限" : "メンバー"}
          </button>
        </div>

        <nav aria-label="セクション" className="-mx-3 mb-4 overflow-x-auto px-3 sm:mx-0 sm:px-0 print:hidden">
          <div className="inline-flex min-w-full gap-1 rounded-xl bg-slate-100 p-1 sm:min-w-0">
            {tabs.map((t) => {
              const active = t.match.includes(rel) || (t.href !== "" && t.match.some((m) => m && rel.startsWith(m + "/")));
              return (
                <Link key={t.href} href={base + t.href} aria-current={active ? "page" : undefined}
                  className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${active ? "bg-surface text-accent shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                  <t.icon size={15} />
                  {t.label}
                  {t.href === "/trash" && store.trash.length > 0 && <span className="rounded-full bg-slate-200 px-1.5 text-[10px] text-slate-500">{store.trash.length}</span>}
                </Link>
              );
            })}
          </div>
        </nav>

        {store.error && <p role="alert" className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-danger">{store.error}</p>}
        {store.loading ? <p className="p-8 text-center text-sm text-slate-400">読み込み中…</p> : children}

        {showShare && <ShareDialog set={set} isAdmin={canManageMembers(role)} onClose={() => setShowShare(false)} />}
      </div>
    </div>
  );
}

export default function SetLayout({ children }: { children: React.ReactNode }) {
  const { setId } = useParams<{ setId: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { set, loading: setLoading, error, actions } = useQuestionSet(setId);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  if (authLoading || setLoading || !user) return <p className="p-8 text-center text-sm text-slate-400">読み込み中…</p>;
  if (error === "denied" || (set && !set.members[user.uid])) {
    return <div className="p-6 text-center text-sm text-slate-500">この問題セットへのアクセス権がありません。</div>;
  }
  if (!set) return <div className="p-6 text-center text-sm text-slate-500">問題セットが見つかりません。</div>;

  return (
    <SetProvider set={set} actions={actions}>
      <QuestionsProvider setId={set.id}>
        <SetShell>{children}</SetShell>
      </QuestionsProvider>
    </SetProvider>
  );
}
