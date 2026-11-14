import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "./Logo";
import { LEGAL_UPDATED } from "@/lib/legal";

// 利用規約・プライバシーポリシー・お問い合わせの、共通の枠
export function LegalPage({ title, updated = true, children }: { title: string; updated?: boolean; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-slate-800"><Logo size={26} /><span className="font-semibold">Qraft</span></Link>
        <Link href="/" className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"><ArrowLeft size={12} />トップへ</Link>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-4 sm:px-6">
        <h1 className="mb-2 text-2xl font-bold tracking-[-0.01em] text-slate-900">{title}</h1>
        {updated && <p className="mb-8 text-xs text-slate-400">最終更新日：{LEGAL_UPDATED}</p>}
        <div className="rounded-2xl border border-slate-100 bg-surface p-5 shadow-card sm:p-8">{children}</div>
        <nav aria-label="規約など" className="mt-8 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400">
          <Link href="/terms" className="hover:text-slate-600">利用規約</Link>
          <Link href="/privacy" className="hover:text-slate-600">プライバシーポリシー</Link>
          <Link href="/contact" className="hover:text-slate-600">お問い合わせ</Link>
        </nav>
      </main>
    </div>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 mt-8 text-base font-semibold text-slate-800 first:mt-0">{children}</h2>;
}
export function P({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-sm leading-7 text-slate-600">{children}</p>;
}
export function UL({ children }: { children: React.ReactNode }) {
  return <ul className="mb-3 list-disc space-y-1 pl-5 text-sm leading-7 text-slate-600">{children}</ul>;
}
