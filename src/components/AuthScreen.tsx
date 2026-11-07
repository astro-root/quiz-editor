"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AuthCredential } from "firebase/auth";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme";

const jp = { wordBreak: "auto-phrase", textWrap: "pretty" } as unknown as React.CSSProperties;

function googleError(code?: string): string {
  switch (code) {
    case "auth/popup-blocked": return "ポップアップがブロックされました。ブラウザの設定でポップアップを許可して、もう一度お試しください。";
    case "auth/network-request-failed": return "通信に失敗しました。接続を確認して、もう一度お試しください。";
    case "auth/unauthorized-domain": return "このアドレスからのログインは許可されていません（Firebase の「承認済みドメイン」への追加が必要です）。";
    case "auth/operation-not-allowed": return "Googleでのログインが有効になっていません（Firebase コンソールで Google を有効にしてください）。";
    case "auth/too-many-requests": return "短時間に試行しすぎました。しばらくしてからお試しください。";
    case "auth/user-disabled": return "このアカウントは無効になっています。";
    default: return "ログインできませんでした。もう一度お試しください。";
  }
}
function linkError(code?: string): string {
  switch (code) {
    case "auth/wrong-password":
    case "auth/invalid-credential": return "パスワードが違います。";
    case "auth/too-many-requests": return "短時間に試行しすぎました。しばらくしてからお試しください。";
    case "auth/operation-not-allowed": return "メールとパスワードでのログインが無効になっているため、連結できません。";
    case "auth/credential-already-in-use": return "このGoogleアカウントは、すでに別のアカウントに連結されています。";
    default: return "連結できませんでした。もう一度お試しください。";
  }
}

// Google の「G」（ブランドガイドラインどおりの4色）
function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

// 左の見せ場：問題が書かれて保存されていく様子を、繰り返し見せる（動きを減らす設定のときは、静止した絵にする）
const script = [
  { q: "日本で最も面積の大きい都道府県はどこでしょう？", a: "北海道" },
  { q: "元素記号Auで表される元素は何でしょう？", a: "金" },
  { q: "鎌倉幕府を開いた人物は誰でしょう？", a: "源頼朝" },
];

function WritingLoop() {
  const reduce = useReducedMotion();
  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  const [flash, setFlash] = useState(false);
  const [saved, setSaved] = useState<{ id: number; q: string; a: string }[]>([]);

  useEffect(() => {
    if (reduce) {
      setQ(script[0].q);
      setA(script[0].a);
      setSaved([{ id: 0, q: script[1].q, a: script[1].a }]);
      return;
    }
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const wait = (ms: number) => new Promise<void>((r) => { timer = setTimeout(r, ms); });
    (async () => {
      let n = 0;
      let id = 0;
      while (alive) {
        const s = script[n % script.length];
        setQ(""); setA("");
        for (let k = 1; k <= s.q.length && alive; k++) { setQ(s.q.slice(0, k)); await wait(46); }
        await wait(260);
        for (let k = 1; k <= s.a.length && alive; k++) { setA(s.a.slice(0, k)); await wait(110); }
        await wait(520);
        if (!alive) break;
        setFlash(true);
        setSaved((l) => [{ id: id++, q: s.q, a: s.a }, ...l].slice(0, 3));
        await wait(650);
        setFlash(false);
        setQ(""); setA("");
        await wait(450);
        n++;
      }
    })();
    return () => { alive = false; clearTimeout(timer); };
  }, [reduce]);

  return (
    <div className="w-full max-w-md rounded-xl border border-slate-200 bg-surface p-4 shadow-pop" aria-hidden>
      <p className="mb-2 text-xs text-slate-400">新しい問題</p>
      <p className="mb-1 text-xs text-slate-400">問題文</p>
      <div className="mb-3 min-h-[4.5rem] rounded-lg border border-slate-200 p-2.5 text-[15px] leading-relaxed text-slate-700">
        {q}
        {!reduce && <span className="ml-px inline-block h-4 w-px translate-y-0.5 animate-pulse bg-slate-500" />}
      </div>
      <p className="mb-1 text-xs text-slate-400">解答</p>
      <div className="mb-3 min-h-[2.6rem] rounded-lg border border-slate-200 p-2.5 text-[15px] font-medium text-accent">{a}</div>
      <div className="flex items-center gap-3">
        <span className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition ${flash ? "scale-95 bg-brand-700" : "bg-brand-600"}`}>保存して次へ</span>
        <AnimatePresence>
          {flash && (
            <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="text-xs text-ok">保存しました</motion.span>
          )}
        </AnimatePresence>
      </div>
      <ul className="mt-4 space-y-2 border-t border-slate-100 pt-3">
        <AnimatePresence initial={false}>
          {saved.map((s) => (
            <motion.li key={s.id} layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="rounded-lg border border-slate-200 p-2.5 text-sm">
              <p className="truncate text-slate-700">{s.q}</p>
              <p className="flex items-center justify-between"><span className="text-accent">{s.a}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">下書き</span></p>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

export function AuthScreen({ mode }: { mode: "login" | "signup" }) {
  const { user, loading, signInWithGoogle, linkGoogleToPasswordAccount } = useAuth();
  const router = useRouter();
  const { resolved } = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<{ email: string; credential: AuthCredential } | null>(null);
  const [password, setPassword] = useState("");
  const linking = useRef(false); // パスワードでの連結中は、ログイン済みになっても、ダッシュボードへ移動しない

  useEffect(() => {
    if (!loading && user && !linking.current) router.replace("/dashboard");
  }, [user, loading, router]);

  if (loading || (user && !linking.current)) return null;

  async function handleGoogle() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await signInWithGoogle();
      if (r.status === "needs-link") setPending({ email: r.email, credential: r.credential });
      // ログインできたときは、上の useEffect がダッシュボードへ移動する
    } catch (e: any) {
      if (e?.code !== "auth/popup-closed-by-user" && e?.code !== "auth/cancelled-popup-request") {
        console.error("Googleログインに失敗しました", e?.code);
        setError(googleError(e?.code));
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleLink(e: React.FormEvent) {
    e.preventDefault();
    if (!pending || busy) return;
    setBusy(true);
    setError("");
    linking.current = true;
    try {
      await linkGoogleToPasswordAccount(pending.email, password, pending.credential);
      router.replace("/dashboard");
    } catch (err: any) {
      linking.current = false;
      console.error("Googleの連結に失敗しました", err?.code);
      setError(linkError(err?.code));
    } finally {
      setBusy(false);
    }
  }

  const dark = resolved === "dark";
  const googleCls = dark
    ? "border-[#8e918f] bg-[#131314] text-[#e3e3e3] hover:bg-[#1e1f20]"
    : "border-[#747775] bg-[#ffffff] text-[#1f1f1f] hover:bg-[#f7f8f8]";

  return (
    <div className="grid min-h-screen bg-slate-50 lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-slate-200 bg-surface p-10 lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(rgb(var(--slate-300) / 0.5) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            maskImage: "linear-gradient(to bottom, black 0%, transparent 75%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 0%, transparent 75%)",
          }}
        />
        <Link href="/" className="relative flex items-center gap-2.5 text-slate-800">
          <Logo size={30} />
          <span className="font-semibold">Qraft</span>
        </Link>
        <div className="relative">
          <motion.h2 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-8 max-w-sm text-3xl font-bold leading-tight tracking-[-0.02em] text-slate-900" style={{ fontFeatureSettings: '"palt"' }}>
            作問から本番まで、<br />ひとつのツールで。
          </motion.h2>
          <WritingLoop />
        </div>
        <p className="relative text-xs text-slate-400">Qraft — クイズ作問エディタ</p>
      </aside>

      <main className="flex flex-col items-center justify-center px-5 py-10">
        <div className="mb-8 flex w-full max-w-sm items-center justify-between lg:hidden">
          <Link href="/" className="flex items-center gap-2 text-slate-800"><Logo size={28} /><span className="font-semibold">Qraft</span></Link>
        </div>
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }} className="w-full max-w-sm">
          {!pending ? (
            <>
              <h1 className="mb-2 text-2xl font-bold tracking-[-0.01em] text-slate-900">{mode === "login" ? "ログイン" : "Qraftをはじめる"}</h1>
              <p className="mb-7 text-sm text-slate-500" style={jp}>{mode === "login" ? "Googleアカウントでログインします。" : "Googleアカウントがあれば、すぐに始められます。"}</p>
              <button type="button" onClick={handleGoogle} disabled={busy} className={`flex min-h-[48px] w-full items-center justify-center gap-3 rounded-full border px-4 text-[15px] font-medium transition disabled:opacity-60 ${googleCls}`}>
                {busy ? <Loader2 size={18} className="animate-spin" /> : <GoogleG />}
                <span>{mode === "login" ? "Google でログイン" : "Google で続ける"}</span>
              </button>
              {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-danger">{error}</p>}
              <p className="mt-6 text-xs leading-relaxed text-slate-400" style={jp}>
                ログインすると、Googleアカウントの名前とアイコンが、ログインしている他の利用者から見えるようになります（招待の検索や、メンバーの表示に使われます）。メールアドレスは、画面には出ませんが、参加している問題セットのメンバーが読み取れる形で保存されます。
              </p>
              <p className="mt-3 text-xs leading-relaxed text-slate-400" style={jp}>
                LINEなどのアプリ内ブラウザでは、Googleでログインできないことがあります。その場合は、ChromeやSafariで開いてください。
              </p>
            </>
          ) : (
            <form onSubmit={handleLink}>
              <h1 className="mb-2 text-2xl font-bold tracking-[-0.01em] text-slate-900">アカウントを連結します</h1>
              <p className="mb-5 text-sm leading-relaxed text-slate-500" style={jp}>
                <span className="break-all font-medium text-slate-700">{pending.email}</span> は、これまでメールとパスワードで登録されています。一度だけ、そのパスワードを入力して、Googleと連結してください。以後は、Googleだけでログインできます。
              </p>
              <label htmlFor="link-password" className="mb-1 block text-xs text-slate-400">これまでのパスワード</label>
              <input id="link-password" type="password" autoComplete="current-password" autoFocus required value={password} onChange={(e) => setPassword(e.target.value)} className="mb-3 w-full rounded-lg border border-slate-200 p-3 text-base focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100" />
              {error && <p role="alert" className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-danger">{error}</p>}
              <button type="submit" disabled={busy || !password} className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
                {busy && <Loader2 size={15} className="animate-spin" />}連結してログイン
              </button>
              <button type="button" onClick={() => { setPending(null); setPassword(""); setError(""); }} className="mt-3 flex w-full items-center justify-center gap-1 text-xs text-slate-400 hover:text-slate-600"><ArrowLeft size={12} />戻る</button>
            </form>
          )}
        </motion.div>
        <Link href="/" className="mt-10 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"><ArrowLeft size={12} />トップへ戻る</Link>
      </main>
    </div>
  );
}
