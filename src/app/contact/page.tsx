"use client";

import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { LegalPage, P } from "@/components/LegalPage";

const input = "w-full rounded-lg border border-slate-200 bg-surface p-2.5 text-base text-slate-700 placeholder:text-slate-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";
const label = "mb-1 block text-xs text-slate-500";
const THROTTLE_KEY = "qraft:contact:last";
const categories = [
  { v: "service", t: "サービスについて" },
  { v: "bug", t: "不具合の報告" },
  { v: "account", t: "アカウントについて（停止・削除など）" },
  { v: "legal", t: "利用規約・プライバシーポリシーについて" },
  { v: "other", t: "その他" },
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
      {done ? (
        <div role="status">
          <p className="mb-2 text-base font-semibold text-slate-800">送信しました</p>
          <P>お問い合わせありがとうございます。内容を確認します。返信が必要な場合は、入力いただいたメールアドレス宛にご連絡します（メールアドレスを入力しなかった場合は、返信できません）。お返事には、お時間をいただくことがあります。</P>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <P>サービスについてのご質問、不具合のご報告、アカウントの停止・削除についてなど、こちらからお送りください。送信された内容は、運営者だけが確認できます。取り扱いは、プライバシーポリシーをご覧ください。</P>
          <label className={label} htmlFor="c-cat">種別</label>
          <select id="c-cat" value={category} onChange={(e) => setCategory(e.target.value)} className={`${input} mb-3`}>
            {categories.map((c) => <option key={c.v} value={c.v}>{c.t}</option>)}
          </select>
          <label className={label} htmlFor="c-name">お名前（任意）</label>
          <input id="c-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} autoComplete="name" className={`${input} mb-3`} />
          <label className={label} htmlFor="c-mail">返信先のメールアドレス（任意。返信が必要な場合は、入力してください）</label>
          <input id="c-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} autoComplete="email" className={`${input} mb-3`} />
          <label className={label} htmlFor="c-msg">お問い合わせの内容</label>
          <textarea id="c-msg" value={message} onChange={(e) => setMessage(e.target.value)} rows={8} maxLength={3000} className={`${input} resize-y leading-relaxed`} />
          <p className="mb-3 mt-1 text-right text-xs tabular-nums text-slate-400">{message.length}/3000</p>
          <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label>ウェブサイト<input tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} /></label>
          </div>
          {error && <p role="alert" className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-danger">{error}</p>}
          <button type="submit" disabled={busy} className="flex min-h-[44px] items-center gap-1.5 rounded-lg bg-brand-600 px-6 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40">
            {busy && <Loader2 size={14} className="animate-spin" />}送信する
          </button>
        </form>
      )}
    </LegalPage>
  );
}
