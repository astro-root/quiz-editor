"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MotionConfig, motion } from "framer-motion";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useIsSiteAdmin } from "@/lib/siteAdmin";
import { AdminContact, AdminUser, loadAccounts, loadContacts, loadSets } from "@/lib/adminData";
import { QuestionSet } from "@/lib/types";
import { PageSkeleton } from "@/components/Skeleton";
import { CHROME_X, SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { OverviewTab } from "./OverviewTab";
import { AccountsTab } from "./AccountsTab";
import { SetsTab } from "./SetsTab";
import { ContactsTab } from "./ContactsTab";
import { NoticesTab } from "./NoticesTab";

type Tab = "overview" | "accounts" | "sets" | "contacts" | "notices";
const TAB_IDS: Tab[] = ["overview", "accounts", "sets", "contacts", "notices"];
const labels: Record<Tab, string> = { overview: "概要", accounts: "アカウント", sets: "問題セット", contacts: "お問い合わせ", notices: "お知らせ" };

// 運営者だけの管理ページ。入れるのは、siteAdmins に登録された人だけ（データは、firestore.rules が守る）。
// 開いているタブは、アドレスの # に残る（再読み込みしても、同じタブに戻る）。
export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading } = useIsSiteAdmin();
  const router = useRouter();
  const [tab, setTabState] = useState<Tab>("overview");
  const [accounts, setAccounts] = useState<AdminUser[]>([]);
  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [contacts, setContacts] = useState<AdminContact[] | null>(null);
  const [contactsError, setContactsError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [error, setError] = useState("");
  const [focusSet, setFocusSet] = useState<string | null>(null);
  const [focusUid, setFocusUid] = useState<string | null>(null);

  useEffect(() => { if (!authLoading && !user) router.replace("/login"); }, [authLoading, user, router]);

  // # とタブを同期する
  useEffect(() => {
    const read = () => { const h = window.location.hash.slice(1) as Tab; if (TAB_IDS.includes(h)) setTabState(h); };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  const setTab = useCallback((t: Tab) => { setTabState(t); window.history.replaceState(null, "", `#${t}`); window.scrollTo({ top: 0 }); }, []);

  const reload = useCallback(async () => {
    setError(""); setContactsError(""); setRefreshing(true);
    const [a, s, c] = await Promise.allSettled([loadAccounts(), loadSets(), loadContacts()]);
    if (a.status === "fulfilled" && s.status === "fulfilled") { setAccounts(a.value); setSets(s.value); setLoaded(true); setUpdatedAt(new Date()); }
    else { console.error(a, s); setError("読み込めませんでした。ルールの公開と、運営者の登録（siteAdmins）を確認してください"); }
    if (c.status === "fulfilled") setContacts(c.value);
    else { console.error(c.reason); setContactsError("お問い合わせを読み込めませんでした"); }
    setRefreshing(false);
  }, []);
  useEffect(() => { if (isAdmin) reload(); }, [isAdmin, reload]);

  const clearSet = useCallback(() => setFocusSet(null), []);
  const clearUid = useCallback(() => setFocusUid(null), []);
  const openSet = useCallback((id: string) => { setFocusSet(id); setTab("sets"); }, [setTab]);
  const openAccount = useCallback((uid: string) => { setFocusUid(uid); setTab("accounts"); }, [setTab]);

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
  const newContacts = (contacts ?? []).filter((c) => c.status === "new").length;
  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-dvh flex-col bg-slate-50">
        <SiteHeader sticky={false} />
        <div className={`${CHROME_X} flex-1 pb-10 pt-4 sm:pt-6`}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <Link href="/dashboard" className="mb-1 flex min-h-[28px] items-center gap-1 text-xs text-slate-400 hover:text-slate-600"><ArrowLeft size={12} />ダッシュボードへ</Link>
              <h1 className="text-xl font-semibold text-slate-800">管理</h1>
            </div>
            <div className="flex items-center gap-3">
              {updatedAt && <span className="hidden text-xs text-slate-400 sm:inline">最終更新 {updatedAt.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}</span>}
              <button onClick={reload} disabled={refreshing} className="flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-200 bg-surface px-3 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60">
                {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}再読み込み
              </button>
            </div>
          </div>

          <div role="tablist" aria-label="管理メニュー" className="sticky top-0 z-20 -mx-4 mb-5 flex gap-1 overflow-x-auto bg-slate-50/90 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
            <div className="flex w-max min-w-full gap-1 rounded-xl bg-slate-100 p-1">
              {TAB_IDS.map((id) => (
                <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`relative flex min-h-[44px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-4 text-sm font-medium transition-colors ${tab === id ? "text-accent" : "text-slate-500 hover:text-slate-700"}`}>
                  {tab === id && <motion.span layoutId="admin-tab-pill" className="absolute inset-0 rounded-lg bg-surface shadow-sm" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
                  <span className="relative z-10">{labels[id]}</span>
                  {id === "contacts" && newContacts > 0 && <span className="relative z-10 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-medium text-white">{newContacts}</span>}
                </button>
              ))}
            </div>
          </div>

          {error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-danger">{error}</p>}
          <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: "easeOut" }}>
            {!loaded && !error && tab !== "contacts" && tab !== "notices" ? <p className="py-10 text-center text-sm text-slate-400">読み込み中…</p> : (
              <>
                {tab === "overview" && <OverviewTab accounts={accounts} sets={sets} contacts={contacts} go={setTab} openAccount={openAccount} openSet={openSet} />}
                {tab === "accounts" && <AccountsTab me={user.uid} accounts={accounts} sets={sets} focusUid={focusUid} onFocusDone={clearUid} onChanged={reload} onOpenSet={openSet} />}
                {tab === "sets" && <SetsTab sets={sets} accounts={accounts} focusSetId={focusSet} onFocusDone={clearSet} onOpenAccount={openAccount} />}
                {tab === "contacts" && <ContactsTab items={contacts} setItems={setContacts} error={contactsError} nameOf={nameOf} onReload={reload} />}
                {tab === "notices" && <NoticesTab />}
              </>
            )}
          </motion.div>
        </div>
        <SiteFooter />
      </div>
    </MotionConfig>
  );
}
