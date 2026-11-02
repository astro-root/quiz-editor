"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

// これまでメールとパスワードでログインしていた人に、Googleとの連結を案内する（連結済みなら何も出さない）。
// 連結すると、同じアカウント（同じ問題セット・権限）のまま、Googleでログインできるようになる。
export function LinkGoogleBanner() {
  const { user, linkGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!user || user.providerData.some((p) => p.providerId === "google.com")) return null;

  async function run() {
    setBusy(true);
    setError("");
    try {
      await linkGoogle();
    } catch (e: any) {
      if (e?.code === "auth/popup-closed-by-user" || e?.code === "auth/cancelled-popup-request") return;
      console.error("Googleの連結に失敗しました", e?.code);
      setError(
        e?.code === "auth/credential-already-in-use"
          ? "このGoogleアカウントは、すでに別のアカウントとして使われています。別のGoogleアカウントを選ぶか、管理者に相談してください。"
          : e?.code === "auth/popup-blocked"
            ? "ポップアップがブロックされました。許可してから、もう一度お試しください。"
            : "連結できませんでした。もう一度お試しください。"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
      <p className="mb-2 text-warn-strong">このアカウントは、まだGoogleと連結されていません。今後はGoogleでのログインのみになるため、連結をお願いします。連結しても、問題セットや権限は、そのまま引き継がれます。</p>
      <button onClick={run} disabled={busy} className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50">
        {busy && <Loader2 size={13} className="animate-spin" />}Googleアカウントを連結する
      </button>
      {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
