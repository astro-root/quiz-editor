"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  PencilLine,
  LayoutGrid,
  Users2,
  MessageCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  BadgeCheck,
  Pencil,
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
    title: "4段階の権限管理",
    body: "管理者・問題統括・作問者・閲覧者で役割を分け、それぞれができることを明確に制限できる。",
  },
  {
    icon: MessageCircle,
    title: "コメント・改訂履歴",
    body: "問題ごとにコメントを残せる。問題統括による改訂や採用判定は履歴として自動で記録される。",
  },
];

const workflow = [
  {
    icon: Pencil,
    role: "作問者",
    body: "問題を書き、下書き→作問完了へ。自分の問題はいつでも編集・削除できる。",
  },
  {
    icon: BadgeCheck,
    role: "問題統括",
    body: "上がってきた問題を校正し、必要なら改訂版を作成。採用・不採用を判定する。",
  },
  {
    icon: ShieldCheck,
    role: "管理者",
    body: "メンバーを招待し、ジャンルとお知らせを整備して、大会運営全体を見渡す。",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;
    router.replace("/dashboard");
  }, [user, loading, router]);

  if (loading || user) return null;

  return (
    <div className="min-h-screen overflow-hidden bg-white">
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

      <section className="relative hero-glow">
        <motion.div
          className="pointer-events-none absolute -top-24 left-[10%] h-64 w-64 rounded-full bg-brand-200/40 blur-3xl"
          animate={{ y: [0, 20, 0], x: [0, 10, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="pointer-events-none absolute right-[8%] top-10 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl"
          animate={{ y: [0, -16, 0], x: [0, -12, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="mx-auto grid max-w-5xl items-center gap-12 px-6 py-16 md:grid-cols-2 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
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
                className="group flex items-center gap-1.5 rounded-lg bg-brand-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
              >
                無料で始める
                <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/login"
                className="rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600"
              >
                ログイン
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-2xl border border-slate-100 bg-white p-5 shadow-pop"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                下書き
              </span>
              <motion.span
                className="text-xs text-slate-300"
                animate={{ opacity: [0, 1, 1, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, times: [0, 0.2, 0.8, 1] }}
              >
                保存済み
              </motion.span>
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
              <motion.span
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                次の問題へ →
              </motion.span>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-5xl px-6 py-16">
        <motion.h2
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.6 }}
          variants={fadeUp}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center text-2xl font-semibold text-slate-900"
        >
          作問という作業のためだけに作った
        </motion.h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.4 }}
              variants={fadeUp}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              whileHover={{ y: -3 }}
              className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-pop"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <f.icon size={18} />
              </div>
              <h3 className="mb-1 font-medium text-slate-800">{f.title}</h3>
              <p className="text-sm text-slate-500">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-5xl px-6">
          <motion.h2
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.6 }}
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="mb-10 text-center text-2xl font-semibold text-slate-900"
          >
            作問者から管理者まで、役割に沿って進む
          </motion.h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {workflow.map((w, i) => (
              <motion.div
                key={w.role}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.4 }}
                variants={fadeUp}
                transition={{ duration: 0.4, delay: i * 0.12 }}
                className="relative rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
              >
                <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-sky-400 text-xs font-semibold text-white">
                  {i + 1}
                </span>
                <div className="mb-2 flex items-center gap-2">
                  <w.icon size={16} className="text-brand-600" />
                  <h3 className="font-medium text-slate-800">{w.role}</h3>
                </div>
                <p className="text-sm text-slate-500">{w.body}</p>
                {i < workflow.length - 1 && (
                  <ArrowRight
                    size={18}
                    className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-slate-300 sm:block"
                  />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.6 }}
        variants={fadeUp}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-3xl px-6 py-16 text-center"
      >
        <p className="text-lg text-slate-700">
          「表計算ソフトをクイズ向けにする」のではなく、
          クイズの問題を1つのオブジェクトとして扱うところから設計した。
          セルでも行でもなく、問題文・答え・出典・タグを持つカードとして編集する。
        </p>
      </motion.section>

      <section className="relative overflow-hidden bg-gradient-to-br from-brand-600 to-sky-500 py-16 text-center text-white">
        <motion.div
          className="pointer-events-none absolute -bottom-16 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-white/10 blur-3xl"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.h2
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={fadeUp}
          transition={{ duration: 0.4 }}
          className="relative mb-4 text-2xl font-semibold"
        >
          今すぐ作問を始める
        </motion.h2>
        <p className="relative mb-8 text-brand-50">アカウント登録は1分で終わる。</p>
        <Link
          href="/signup"
          className="relative rounded-lg bg-white px-6 py-3 text-sm font-medium text-brand-600 shadow-sm transition hover:bg-brand-50"
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
