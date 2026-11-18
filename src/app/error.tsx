"use client";

import { useEffect } from "react";
import Link from "next/link";

// 画面の表示中に、予期しないエラーが起きたとき。真っ白にせず、やり直しの手段を出す。
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("画面でエラーが起きました", error); }, [error]);
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <h1 className="mb-2 text-xl font-semibold text-slate-800">問題が起きました</h1>
      <p className="mb-6 max-w-sm text-sm leading-relaxed text-slate-500">表示中にエラーが起きました。もう一度お試しください。直らない場合は、お問い合わせからお知らせください。</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button onClick={reset} className="min-h-[44px] rounded-lg bg-brand-600 px-6 text-sm font-medium text-white hover:bg-brand-700">もう一度試す</button>
        <Link href="/" className="flex min-h-[44px] items-center rounded-lg border border-slate-200 bg-surface px-6 text-sm text-slate-600 hover:bg-slate-50">トップへ</Link>
        <Link href="/contact" className="flex min-h-[44px] items-center px-3 text-sm text-slate-400 underline hover:text-slate-600">お問い合わせ</Link>
      </div>
    </div>
  );
}
