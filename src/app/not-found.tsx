import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

// 存在しないページ
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[96rem] flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:px-6 lg:px-12">
        <p className="mb-2 text-5xl font-bold tracking-tight text-slate-300">404</p>
        <h1 className="mb-2 text-xl font-semibold text-slate-800">ページが見つかりません</h1>
        <p className="mb-6 max-w-sm text-sm leading-relaxed text-slate-500">アドレスが間違っているか、ページが移動・削除された可能性があります。</p>
        <Link href="/" className="flex min-h-[44px] items-center rounded-lg bg-brand-600 px-6 text-sm font-medium text-white hover:bg-brand-700">トップへ戻る</Link>
      </main>
      <SiteFooter />
    </div>
  );
}
