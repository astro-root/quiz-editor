"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PencilLine,
  LayoutGrid,
  Users2,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const features = [
  {
    icon: PencilLine,
    title: "作問モード",
    body: "問題文と答えだけを大きく表示。⌘/Ctrl+Enterで保存して、そのまま次の問題へ進める。",
  },
  {
    icon: LayoutGrid,
    title: "管理モード",
    body: "作問者・ジャンル・ステータス・校正状態で絞り込み、問題セット全体を俯瞰できる。",
  },
  {
    icon: Users2,
    title: "共有・権限管理",
    body: "メールアドレスで招待し、オーナー・編集者・閲覧者の3段階で権限を分けられる。",
  },
  {
    icon: MessageCircle,
    title: "コメント・変更履歴",
    body: "問題ごとにコメントを残せる。採用・不採用の判断は変更履歴として自動で記録される。",
  },
];

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;
    router.replace("/dashboard");
  }, [user, loading, router]);

  if (loading || user) return null;

  return (
    <div className="min-h-screen bg-white">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-sky-400 text-white shadow-sm">
            <Sparkles size={16} />
          </div>
          <span className="text-lg font-semibold text-slate-800">Qraft</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm text-slate-500 hover:text-slate-700">
            ログイン
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
          >
            無料で始める
          </Link>
        </div>
      </header>

      <section className="hero-glow">
        <div className="mx-auto grid max-w-5xl items-center gap-12 px-6 py-16 md:grid-cols-2 md:py-24">
          <div>
            <h1 className="text-3xl font-semibold leading-snug text-slate-900 md:text-4xl">
              問題を書くことだけに
              <br />
              集中できる、クイズ作問エディタ
            </h1>
            <p className="mt-5 text-slate-600">
              Excelでもスプレッドシートでもない、クイズの作問に特化した専用エディタ。
              1問ずつカードとして書き、⌘/Ctrl+Enterで次の問題へ。30問でも50問でも、
              手を止めずに作り続けられる。
            </p>
            <div className="mt-8 flex gap-3">
              <Link
                href="/signup"
                className="rounded-lg bg-brand-600 px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
              >
                無料で始める
              </Link>
              <Link
                href="/login"
                className="rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600"
              >
                ログイン
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-pop">
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                下書き
              </span>
              <span className="text-xs text-slate-300">保存済み</span>
            </div>
            <div className="mb-2 rounded-xl border border-slate-200 p-3 text-sm leading-relaxed text-slate-700">
              日本で最も面積の大きい都道府県はどこでしょう？
            </div>
            <div className="mb-4 rounded-xl border border-brand-100 bg-brand-50/50 p-3 text-sm font-medium text-brand-700">
              北海道
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>
                <kbd className="rounded border border-slate-200 px-1">⌘/Ctrl</kbd>+
                <kbd className="rounded border border-slate-200 px-1">Enter</kbd>
              </span>
              <span>次の問題へ →</span>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="mb-10 text-center text-2xl font-semibold text-slate-900">
          作問という作業のためだけに作った
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <f.icon size={18} />
              </div>
              <h3 className="mb-1 font-medium text-slate-800">{f.title}</h3>
              <p className="text-sm text-slate-500">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-lg text-slate-700">
          「表計算ソフトをクイズ向けにする」のではなく、
          クイズの問題を1つのオブジェクトとして扱うところから設計した。
          セルでも行でもなく、問題文・答え・出典・タグを持つカードとして編集する。
        </p>
      </section>

      <section className="bg-gradient-to-br from-brand-600 to-sky-500 py-16 text-center text-white">
        <h2 className="mb-4 text-2xl font-semibold">今すぐ作問を始める</h2>
        <p className="mb-8 text-brand-50">アカウント登録は1分で終わる。</p>
        <Link
          href="/signup"
          className="rounded-lg bg-white px-6 py-3 text-sm font-medium text-brand-600 shadow-sm hover:bg-brand-50"
        >
          無料で始める
        </Link>
      </section>

      <footer className="mx-auto max-w-5xl px-6 py-8 text-center text-xs text-slate-400">
        Qraft — クイズ作問エディタ
      </footer>
    </div>
  );
}
