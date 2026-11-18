"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { LogOut, Moon, Sun } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme";
import { useIsSiteAdmin } from "@/lib/siteAdmin";
import { Logo } from "./Logo";
import { Avatar } from "./Avatar";
import { NoticeBell } from "./NoticeBell";

// 公開ページ（トップ・利用規約・プライバシーポリシー・お問い合わせ）の、共通のヘッダーとフッター。
// 左右の余白・高さ・並びを、ここ1か所で決める（ページごとに作ると、少しずつずれていく）。
export const CHROME_X = "mx-auto w-full max-w-[96rem] px-4 sm:px-6 lg:px-12";

export function ThemeButton() {
  const { resolved, setPreference } = useTheme();
  return (
    <button
      type="button"
      onClick={() => setPreference(resolved === "dark" ? "light" : "dark")}
      aria-label={resolved === "dark" ? "ライトモードに切り替え" : "ダークモードに切り替え"}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={resolved} initial={{ rotate: -60, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 60, opacity: 0 }} transition={{ duration: 0.18 }}>
          {resolved === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

// landing：トップページでは、ページ内リンク（#features）。ほかのページでは、トップページのその位置へ（/#features）。
// sticky：画面の上に固定する（公開ページ）。アプリの画面（一覧・設定・問題セット・管理）では、固定しない
//   （固定すると、その下で上に張り付く検索欄などの位置が、隠れてしまうため）。
// ログイン中は、管理（運営者のみ）・お知らせのベル・アカウント設定（アイコン）・ログアウトを出す。
export function SiteHeader({ landing = false, sticky = true }: { landing?: boolean; sticky?: boolean }) {
  const { user, logOut } = useAuth();
  const { isAdmin } = useIsSiteAdmin();
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 12));
  const base = landing ? "" : "/";
  const anchor = "hidden rounded-lg px-3 py-2 text-sm text-slate-500 hover:text-slate-800 sm:block";
  return (
    <header className={`${sticky ? "sticky top-0 z-40" : "relative"} border-b transition-colors duration-300 print:hidden ${sticky && scrolled ? "border-slate-200 bg-slate-50/80 backdrop-blur-md" : "border-transparent"}`}>
      <div className={`${CHROME_X} flex items-center justify-between py-3`}>
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2.5" aria-label="Qraft トップへ">
          <Logo size={28} />
          <span className="font-semibold text-slate-800">Qraft</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="メニュー">
          {user ? (
            <>
              {isAdmin && <Link href="/admin" className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-100">管理</Link>}
              {pathname !== "/dashboard" && <Link href="/dashboard" className="hidden rounded-lg px-3 py-2 text-sm text-slate-500 hover:text-slate-800 sm:block">ダッシュボード</Link>}
              <ThemeButton />
              <NoticeBell />
              <Link href="/account" aria-label="アカウント設定" title="アカウント設定" className="flex items-center rounded-full ring-offset-2 ring-offset-slate-50 transition hover:ring-2 hover:ring-brand-300 focus-visible:ring-2 focus-visible:ring-brand-400">
                <Avatar name={user.displayName || user.email || ""} photoURL={user.photoURL ?? ""} size={30} />
              </Link>
              <button onClick={logOut} className="flex min-h-[36px] items-center gap-1 rounded-lg px-2 text-sm text-slate-400 hover:text-slate-600"><LogOut size={14} /><span className="hidden sm:inline">ログアウト</span></button>
            </>
          ) : (
            <>
              <a href={`${base}#features`} className={anchor}>機能</a>
              <a href={`${base}#faq`} className={anchor}>よくある質問</a>
              <ThemeButton />
              <Link href="/login" className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:text-slate-800">ログイン</Link>
              <Link href="/signup" className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 sm:px-4">始める</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className={`${CHROME_X} flex flex-wrap items-center gap-x-2 gap-y-2 pb-10 pt-6 text-xs text-slate-400 print:hidden`}>
      <Logo size={16} />
      <span>Qraft — クイズ作問エディタ</span>
      <nav aria-label="規約など" className="ml-auto flex flex-wrap gap-x-4 gap-y-1">
        <Link href="/terms" className="flex min-h-[28px] items-center hover:text-slate-600">利用規約</Link>
        <Link href="/privacy" className="flex min-h-[28px] items-center hover:text-slate-600">プライバシーポリシー</Link>
        <Link href="/contact" className="flex min-h-[28px] items-center hover:text-slate-600">お問い合わせ</Link>
      </nav>
    </footer>
  );
}
