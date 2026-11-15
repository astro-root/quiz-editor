"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { CheckCircle2, Clock, Loader2, Lock, ShieldAlert } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { LegalPage, P } from "@/components/LegalPage";

const input = "w-full rounded-lg border border-slate-200 bg-surface p-2.5 text-base text-slate-700 placeholder:text-slate-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";
const label = "mb-1 block text-xs text-slate-500";
const THROTTLE_KEY = "qraft:contact:last";
const ease = [0.2, 0.8, 0.2, 1] as const;
const categories = [
  { v: "service", t: "サービスについて" },
  { v: "bug", t: "不具合の報告" },
  { v: "account", t: "アカウントについて（停止・削除など）" },
  { v: "legal", t: "利用規約・プライバシーポリシーについて" },
  { v: "other", t: "その他" },
];
const notes = [
  { icon: Clock, title: "お返事について", body: "返信が必要な場合は、入力いただいたメールアドレス宛にご連絡します。お返事には、お時間をいただくことがあります。メールアドレスを入力しない場合は、返信できません。" },
  { icon: ShieldAlert, title: "アカウントの停止について", body: "停止の内容に心当たりがない場合も、こちらから送れます。ログインできない状態でも、送信できます。" },
  { icon: Lock, title: "個人情報の取り扱い", body: "送信された内容は、運営者だけが確認できます。取り扱いは、プライバシーポリシーをご覧ください。" },
];

// お問い合わせ。ログインしていなくても送れる（停止中の人も送れるように）。内容は、運営者の管理画面で確認する。
export default function ContactPage() {
  const { user } = useAuth();
  const [category, setCategory] = useState("service");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [trap, setTrap] = useState(""); // 人間には見えない欄。ここに入力があれば、自動の送信とみなす
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    const msg = message.trim();
    if (!msg) return setError("お問い合わせの内容を入力してください");
    if (msg.length > 3000) return setError("お問い合わせの内容は、3000文字以内にしてください");
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("メールアドレスの形式を確認してください");
    try {
      const last = Number(localStorage.getItem(THROTTLE_KEY)) || 0;
      if (Date.now() - last < 60_000) return setError("続けて送信するときは、1分ほどあけてください");
    } catch { /* noop */ }
    if (trap) { setDone(true); return; } // 自動の送信には、送ったように見せて、何も保存しない
    setBusy(true);
    try {
      await addDoc(collection(db, "contacts"), {
        name: name.trim().slice(0, 50),
        email: email.trim().slice(0, 200),
        category,
        message: msg,
        uid: user?.uid ?? "",
        status: "new",
        createdAt: serverTimestamp(),
      });
      try { localStorage.setItem(THROTTLE_KEY, String(Date.now())); } catch { /* noop */ }
      setDone(true);
    } catch (err) {
      console.error("お問い合わせの送信に失敗しました", err);
      setError("送信できませんでした。時間をおいて、もう一度お試しください");
    } finally {
      setBusy(false);
    }
  }

  return (
    <LegalPage title="お問い合わせ" updated={false}>
      <div className="lg:grid lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start lg:gap-10 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <ul className="mb-6 space-y-3 lg:mb-0">
          {notes.map((n, i) => (
            <motion.li key={n.title} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease, delay: 0.1 + i * 0.07 }} className="flex gap-3 rounded-2xl border border-slate-100 bg-surface p-4">
              <n.icon size={18} className="mt-0.5 shrink-0 text-brand-500" />
              <div>
                <p className="mb-0.5 text-sm font-medium text-slate-700">{n.title}</p>
                <p className="text-xs leading-relaxed text-slate-500">{n.body}</p>
              </div>
            </motion.li>
          ))}
          <li className="px-1 text-xs text-slate-400">
            <Link href="/privacy" className="underline hover:text-slate-600">プライバシーポリシー</Link>・<Link href="/terms" className="underline hover:text-slate-600">利用規約</Link>
          </li>
        </ul>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease, delay: 0.15 }} className="rounded-2xl border border-slate-100 bg-surface p-5 shadow-card sm:p-8">
          <AnimatePresence mode="wait" initial={false}>
            {done ? (
              <motion.div key="done" role="status" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35, ease }} className="py-6 text-center sm:py-10">
                <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }} className="mb-3 flex justify-center text-ok"><CheckCircle2 size={44} /></motion.div>
                <p className="mb-2 text-lg font-semibold text-slate-800">送信しました</p>
                <P>お問い合わせありがとうございます。内容を確認します。返信が必要な場合は、入力いただいたメールアドレス宛にご連絡します。</P>
                <Link href="/" className="mt-2 inline-flex min-h-[44px] items-center rounded-lg border border-slate-200 bg-surface px-5 text-sm text-slate-600 hover:bg-slate-50">トップへ戻る</Link>
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={submit} noValidate initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative">
                <div className="grid gap-x-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className={label} htmlFor="c-cat">種別</label>
                    <select id="c-cat" value={category} onChange={(e) => setCategory(e.target.value)} className={`${input} mb-3`}>
                      {categories.map((c) => <option key={c.v} value={c.v}>{c.t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={label} htmlFor="c-name">お名前（任意）</label>
                    <input id="c-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} autoComplete="name" className={`${input} mb-3`} />
                  </div>
                  <div>
                    <label className={label} htmlFor="c-mail">返信先のメールアドレス（任意）</label>
                    <input id="c-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} autoComplete="email" className={`${input} mb-3`} />
                  </div>
                </div>
                <label className={label} htmlFor="c-msg">お問い合わせの内容</label>
                <textarea id="c-msg" value={message} onChange={(e) => setMessage(e.target.value)} rows={10} maxLength={3000} className={`${input} resize-y leading-relaxed`} />
                <p className="mb-3 mt-1 text-right text-xs tabular-nums text-slate-400">{message.length}/3000</p>
                <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                  <label>ウェブサイト<input tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} /></label>
                </div>
                <AnimatePresence>
                  {error && <motion.p role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-3 overflow-hidden rounded-lg bg-rose-50 px-3 py-2 text-sm text-danger">{error}</motion.p>}
                </AnimatePresence>
                <button type="submit" disabled={busy} className="flex min-h-[48px] w-full items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-6 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40 sm:w-auto">
                  {busy && <Loader2 size={14} className="animate-spin" />}送信する
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </LegalPage>
  );
}
