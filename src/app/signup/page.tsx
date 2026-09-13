"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function SignupPage() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await signUp(email, password, displayName);
      router.push("/dashboard");
    } catch (err: any) {
      setError("登録に失敗しました。メールアドレスとパスワード（6文字以上）を確認してください。");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-7 shadow-pop"
      >
        <div className="mb-5 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-sky-400 text-white shadow-sm">
            <Sparkles size={16} />
          </div>
          <h1 className="text-lg font-semibold text-slate-800">新規登録</h1>
        </div>
        <input
          type="text"
          placeholder="表示名"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          className="mb-2 w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
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
          placeholder="パスワード（6文字以上）"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mb-2 w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
        <button
          type="submit"
          className="w-full rounded-lg bg-brand-600 p-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
        >
          登録する
        </button>
        <p className="mt-4 text-center text-xs text-slate-500">
          すでにアカウントをお持ちの方は{" "}
          <Link href="/login" className="text-brand-600 underline">
            ログイン
          </Link>
        </p>
      </form>
    </div>
  );
}
