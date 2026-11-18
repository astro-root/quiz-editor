"use client";

import { AdminContact, AdminUser, contactCategoryLabel } from "@/lib/adminData";
import { QuestionSet } from "@/lib/types";
import { fmt } from "./AccountsTab";
import { BackupSection } from "./BackupSection";

type Tab = "accounts" | "sets" | "contacts" | "notices";
const DAY = 24 * 60 * 60 * 1000;

// 概要。いまの状況を、ひと目で。数字や一覧を押すと、その画面に移る。
export function OverviewTab({ accounts, sets, contacts, go, openAccount, openSet }: {
  accounts: AdminUser[]; sets: QuestionSet[]; contacts: AdminContact[] | null;
  go: (t: Tab) => void; openAccount: (uid: string) => void; openSet: (id: string) => void;
}) {
  const week = accounts.filter((a) => a.createdAt > Date.now() - 7 * DAY).length;
  const banned = accounts.filter((a) => a.banned).length;
  const newContacts = (contacts ?? []).filter((c) => c.status === "new");
  const noSet = accounts.filter((a) => !sets.some((s) => s.members[a.uid])).length;

  const tiles: { label: string; value: string | number; sub?: string; tab: Tab; warn?: boolean }[] = [
    { label: "アカウント", value: accounts.length, sub: `直近7日で ${week} 件の登録`, tab: "accounts" },
    { label: "問題セット", value: sets.length, sub: `どこにも参加していないアカウント ${noSet}`, tab: "sets" },
    { label: "未対応のお問い合わせ", value: contacts ? newContacts.length : "—", sub: contacts ? `全 ${contacts.length} 件` : "読み込めませんでした", tab: "contacts", warn: newContacts.length > 0 },
    { label: "停止中のアカウント", value: banned, tab: "accounts" },
  ];

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <button key={t.label} onClick={() => go(t.tab)} className={`rounded-2xl border bg-surface p-4 text-left shadow-card transition hover:border-brand-200 ${t.warn ? "border-brand-300" : "border-slate-100"}`}>
            <p className="text-xs text-slate-400">{t.label}</p>
            <p className={`mt-1 text-3xl font-semibold tabular-nums ${t.warn ? "text-accent" : "text-slate-800"}`}>{t.value}</p>
            {t.sub && <p className="mt-1 text-[11px] text-slate-400">{t.sub}</p>}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section>
          <h2 className="mb-2 text-sm font-medium text-slate-600">未対応のお問い合わせ</h2>
          {newContacts.length === 0 ? <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-300">ありません</p> : (
            <ul className="space-y-2">
              {newContacts.slice(0, 4).map((c) => (
                <li key={c.id}>
                  <button onClick={() => go("contacts")} className="w-full rounded-xl border border-slate-100 bg-surface p-3 text-left hover:border-brand-200">
                    <p className="text-[11px] text-slate-400">{contactCategoryLabel[c.category] ?? c.category}・{fmt(c.createdAt)}</p>
                    <p className="line-clamp-2 text-sm text-slate-700">{c.message}</p>
                  </button>
                </li>
              ))}
              {newContacts.length > 4 && <li><button onClick={() => go("contacts")} className="text-xs text-accent underline">ほか {newContacts.length - 4} 件を見る</button></li>}
            </ul>
          )}
        </section>
        <section>
          <h2 className="mb-2 text-sm font-medium text-slate-600">最近登録したアカウント</h2>
          <ul className="space-y-2">
            {accounts.slice(0, 5).map((a) => (
              <li key={a.uid}>
                <button onClick={() => openAccount(a.uid)} className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-100 bg-surface p-3 text-left hover:border-brand-200">
                  <span className="min-w-0"><span className="block truncate text-sm text-slate-700">{a.displayName || "（表示名なし）"}{a.handle && <span className="ml-1.5 text-xs text-slate-400">@{a.handle}</span>}</span><span className="block text-[11px] text-slate-400">{fmt(a.createdAt)}</span></span>
                  {a.banned && <span className="shrink-0 rounded-full bg-rose-100 px-2 text-[11px] text-rose-600">停止中</span>}
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="mb-2 text-sm font-medium text-slate-600">最近更新された問題セット</h2>
          <ul className="space-y-2">
            {sets.slice(0, 5).map((s) => (
              <li key={s.id}>
                <button onClick={() => openSet(s.id)} className="w-full rounded-xl border border-slate-100 bg-surface p-3 text-left hover:border-brand-200">
                  <span className="block truncate text-sm text-slate-700">{s.name}</span>
                  <span className="block text-[11px] text-slate-400">メンバー {Object.keys(s.members).length}人・{fmt(s.updatedAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <BackupSection accounts={accounts} sets={sets} />
    </div>
  );
}
