"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const { logIn, sendPasswordReset } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await logIn(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError("ログインに失敗しました。メールアドレスとパスワードを確認してください。");
    }
  }

  async function handleReset() {
    setError("");
    setInfo("");
    if (!email.trim()) return setError("上の欄にメールアドレスを入力してから押してください。");
    try {
      await sendPasswordReset(email);
    } catch (err: any) {
      if (err?.code === "auth/invalid-email") return setError("メールアドレスの形式が正しくありません。");
      if (err?.code === "auth/too-many-requests") return setError("短時間に試行しすぎました。しばらくしてからお試しください。");
      // それ以外（未登録のメールなど）は、登録の有無が分からないよう同じ表示にする
    }
    setInfo("登録されているメールアドレスであれば、パスワード再設定の案内を送信しました。");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-surface p-7 shadow-pop"
      >
        <div className="mb-5 flex items-center gap-2">
          <Logo size={32} />
          <h1 className="text-lg font-semibold text-slate-800">ログイン</h1>
        </div>
        <input
          type="email"
          placeholder="メールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mb-2 w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        <input
          type="password"
          placeholder="パスワード"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mb-2 w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        {error && <p className="mb-2 text-xs text-danger">{error}</p>}
        {info && <p role="status" className="mb-2 text-xs text-ok">{info}</p>}
        <button
          type="submit"
          className="w-full rounded-lg bg-brand-600 p-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
        >
          ログイン
        </button>
        <button type="button" onClick={handleReset} className="mt-3 w-full text-center text-xs text-slate-500 underline hover:text-slate-700">
          パスワードをお忘れの方
        </button>
        <p className="mt-4 text-center text-xs text-slate-500">
          アカウントをお持ちでない方は{" "}
          <Link href="/signup" className="text-accent underline">
            新規登録
          </Link>
        </p>
      </form>
    </div>
  );
}
