"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useIsSiteAdmin } from "@/lib/siteAdmin";
import { AdminUser, loadAccounts, loadSets } from "@/lib/adminData";
import { QuestionSet } from "@/lib/types";
import { PageSkeleton } from "@/components/Skeleton";
import { AccountsTab } from "./AccountsTab";
import { SetsTab } from "./SetsTab";
import { ContactsTab } from "./ContactsTab";
import { NoticesTab } from "./NoticesTab";

type Tab = "accounts" | "sets" | "contacts" | "notices";
const tabs: { id: Tab; label: string }[] = [
  { id: "accounts", label: "アカウント" },
  { id: "sets", label: "問題セット" },
  { id: "contacts", label: "お問い合わせ" },
  { id: "notices", label: "お知らせ" },
];

// 運営者だけの管理ページ。入れるのは、siteAdmins に登録された人だけ（データは、firestore.rules が守る）。
export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading } = useIsSiteAdmin();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("accounts");
  const [accounts, setAccounts] = useState<AdminUser[]>([]);
  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [focusSet, setFocusSet] = useState<string | null>(null);

  useEffect(() => { if (!authLoading && !user) router.replace("/login"); }, [authLoading, user, router]);

  const reload = useCallback(async () => {
    setError("");
    try {
      const [a, s] = await Promise.all([loadAccounts(), loadSets()]);
      setAccounts(a); setSets(s); setLoaded(true);
    } catch (e) { console.error(e); setError("読み込めませんでした。ルールの公開と、運営者の登録（siteAdmins）を確認してください"); }
  }, []);
  useEffect(() => { if (isAdmin) reload(); }, [isAdmin, reload]);

  const clearFocus = useCallback(() => setFocusSet(null), []);
  if (authLoading || loading || !user) return <PageSkeleton />;
  if (!isAdmin) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-6 text-center">
        <p className="mb-4 text-sm text-slate-500">このページを表示する権限がありません。</p>
        <Link href="/dashboard" className="text-sm text-accent underline">ダッシュボードへ</Link>
      </div>
    );
  }

  const nameOf = (uid: string) => accounts.find((a) => a.uid === uid)?.displayName || uid;
  return (
    <div className="min-h-dvh bg-slate-50">
      <div className="mx-auto max-w-[96rem] px-4 py-8 sm:px-6 lg:px-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/dashboard" className="mb-1 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"><ArrowLeft size={12} />ダッシュボードへ</Link>
            <h1 className="text-xl font-semibold text-slate-800">管理</h1>
          </div>
          <button onClick={reload} className="flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 bg-surface px-3 text-sm text-slate-600 hover:bg-slate-50"><RefreshCw size={14} />再読み込み</button>
        </div>
        <div role="tablist" aria-label="管理メニュー" className="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
          {tabs.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`min-h-[40px] flex-1 whitespace-nowrap rounded-lg px-4 text-sm font-medium transition-colors ${tab === t.id ? "bg-surface text-accent shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>{t.label}</button>
          ))}
        </div>
        {error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-danger">{error}</p>}
        {!loaded && !error && tab !== "contacts" && tab !== "notices" ? <p className="py-10 text-center text-sm text-slate-400">読み込み中…</p> : (
          <>
            {tab === "accounts" && <AccountsTab me={user.uid} accounts={accounts} sets={sets} onChanged={reload} onOpenSet={(id) => { setFocusSet(id); setTab("sets"); }} />}
            {tab === "sets" && <SetsTab sets={sets} accounts={accounts} focusSetId={focusSet} onFocusDone={clearFocus} />}
            {tab === "contacts" && <ContactsTab nameOf={nameOf} />}
            {tab === "notices" && <NoticesTab />}
          </>
        )}
      </div>
    </div>
  );
}
