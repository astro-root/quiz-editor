"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
    <div className="flex min-h-screen items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <h1 className="mb-4 text-xl font-semibold">新規登録</h1>
        <input
          type="text"
          placeholder="表示名"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          className="mb-2 w-full rounded-lg border border-gray-200 p-2 text-sm"
        />
        <input
          type="email"
          placeholder="メールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mb-2 w-full rounded-lg border border-gray-200 p-2 text-sm"
        />
        <input
          type="password"
          placeholder="パスワード（6文字以上）"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mb-2 w-full rounded-lg border border-gray-200 p-2 text-sm"
        />
        {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 p-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          登録する
        </button>
        <p className="mt-3 text-center text-xs text-gray-500">
          すでにアカウントをお持ちの方は{" "}
          <Link href="/login" className="text-blue-600 underline">
            ログイン
          </Link>
        </p>
      </form>
    </div>
  );
}
