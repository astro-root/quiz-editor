"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Stamp } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const { logIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper">
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-sm rounded-lg border border-kraft-dark bg-card px-7 pb-7 pt-9 shadow-[0_1px_0_#e7dcc3,0_8px_20px_-12px_rgba(32,42,59,0.25)]"
      >
        <span className="punch-holes">
          <span />
          <span />
        </span>
        <div className="mb-6 flex items-center gap-2">
          <Stamp size={18} className="text-stamp" />
          <h1 className="font-mincho text-xl text-ink">Qraft</h1>
        </div>
        <input
          type="email"
          placeholder="メールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mb-2 w-full rounded-md border border-kraft-line bg-card p-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none"
        />
        <input
          type="password"
          placeholder="パスワード"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mb-2 w-full rounded-md border border-kraft-line bg-card p-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none"
        />
        {error && <p className="mb-2 text-xs text-stamp">{error}</p>}
        <button
          type="submit"
          className="w-full rounded-md bg-ink p-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          ログイン
        </button>
        <p className="mt-4 text-center text-xs text-ink-soft">
          アカウントをお持ちでない方は{" "}
          <Link href="/signup" className="text-ink underline">
            新規登録
          </Link>
        </p>
      </form>
    </div>
  );
}
