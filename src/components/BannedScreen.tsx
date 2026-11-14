import Link from "next/link";
import { Ban } from "lucide-react";

// 停止されたアカウントに出す画面。アプリの他の画面は、見られない。
export function BannedScreen({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <Ban size={36} className="mb-4 text-slate-300" />
      <h1 className="mb-2 text-lg font-semibold text-slate-800">このアカウントは停止されています</h1>
      <p className="mb-6 max-w-sm text-sm leading-relaxed text-slate-500">
        利用規約に反する利用などがあったため、このアカウントでの利用を停止しています。心当たりがない場合や、ご不明な点がある場合は、お問い合わせからご連絡ください。
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/contact" className="flex min-h-[44px] items-center rounded-lg bg-brand-600 px-5 text-sm font-medium text-white hover:bg-brand-700">お問い合わせ</Link>
        <button onClick={onLogout} className="min-h-[44px] rounded-lg border border-slate-200 bg-surface px-5 text-sm text-slate-600 hover:bg-slate-50">ログアウト</button>
      </div>
      <nav className="mt-8 flex gap-4 text-xs text-slate-400">
        <Link href="/terms" className="hover:text-slate-600">利用規約</Link>
        <Link href="/privacy" className="hover:text-slate-600">プライバシーポリシー</Link>
      </nav>
    </div>
  );
}
