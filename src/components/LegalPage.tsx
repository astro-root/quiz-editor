"use client";

import { ReactNode, useState } from "react";
import { MotionConfig, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { CHROME_X, SiteFooter, SiteHeader } from "./SiteChrome";
import { LEGAL_UPDATED } from "@/lib/legal";

export interface LegalSection {
  id: string;
  title: string;
  body: ReactNode;
}

const ease = [0.2, 0.8, 0.2, 1] as const;

// 利用規約・プライバシーポリシー・お問い合わせの共通の枠。
// PCでは、横幅いっぱいに広げ、左に目次（スクロールしても付いてくる）、右に本文（広い画面では2段組み）。
// スマホでは、1段組みで、目次は折りたたむ。表示には、ふわっとした動きが付く（OSの「視差効果を減らす」では止まる）。
export function LegalPage({ title, lead, updated = true, sections, children }: {
  title: string; lead?: ReactNode; updated?: boolean; sections?: LegalSection[]; children?: ReactNode;
}) {
  const [tocOpen, setTocOpen] = useState(false);
  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-dvh flex-col bg-slate-50">
        <SiteHeader />

        <main className={`${CHROME_X} flex-1 pb-12 pt-4 sm:pt-6`}>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease, delay: 0.05 }} className="mb-6 sm:mb-8">
            <h1 className="text-2xl font-bold tracking-[-0.01em] text-slate-900 sm:text-3xl">{title}</h1>
            {updated && <p className="mt-2 text-xs text-slate-400">最終更新日：{LEGAL_UPDATED}</p>}
          </motion.div>

          {sections ? (
            <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-10">
              <motion.aside initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.15 }} className="mb-5 lg:sticky lg:top-6 lg:mb-0">
                {/* スマホ：折りたたみ */}
                <div className="rounded-2xl border border-slate-100 bg-surface lg:hidden">
                  <button onClick={() => setTocOpen((o) => !o)} aria-expanded={tocOpen} className="flex min-h-[44px] w-full items-center justify-between px-4 text-sm font-medium text-slate-600">
                    目次<ChevronDown size={16} className={`transition-transform ${tocOpen ? "rotate-180" : ""}`} />
                  </button>
                  {tocOpen && <TocList sections={sections} onPick={() => setTocOpen(false)} className="border-t border-slate-100 p-2" />}
                </div>
                {/* PC：常に表示 */}
                <div className="hidden rounded-2xl border border-slate-100 bg-surface p-3 lg:block">
                  <p className="mb-1 px-2 text-xs font-medium text-slate-400">目次</p>
                  <TocList sections={sections} className="max-h-[calc(100dvh-9rem)] overflow-y-auto overscroll-contain" />
                </div>
              </motion.aside>

              <div className="rounded-2xl border border-slate-100 bg-surface p-5 shadow-card sm:p-8 lg:p-10">
                {lead && <div className="mb-8 border-b border-slate-100 pb-6">{lead}</div>}
                <div className="xl:columns-2 xl:gap-14">
                  {sections.map((s, i) => (
                    <motion.section
                      key={s.id}
                      id={s.id}
                      initial={{ opacity: 0, y: 14 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "0px 0px -40px 0px" }}
                      transition={{ duration: 0.45, ease, delay: Math.min(i, 3) * 0.04 }}
                      className="mb-8 scroll-mt-6 last:mb-0"
                    >
                      <h2 className="mb-2 text-base font-semibold text-slate-800 [break-after:avoid-column]">{s.title}</h2>
                      {s.body}
                    </motion.section>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            children
          )}

        </main>
        <SiteFooter />
      </div>
    </MotionConfig>
  );
}

function TocList({ sections, onPick, className = "" }: { sections: LegalSection[]; onPick?: () => void; className?: string }) {
  return (
    <ol className={className}>
      {sections.map((s) => (
        <li key={s.id}>
          <a href={`#${s.id}`} onClick={onPick} className="block rounded-lg px-2 py-1.5 text-[13px] leading-snug text-slate-500 hover:bg-slate-50 hover:text-slate-800">{s.title}</a>
        </li>
      ))}
    </ol>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p className="mb-3 break-words text-sm leading-7 text-slate-600 sm:text-[15px]">{children}</p>;
}
export function UL({ children }: { children: ReactNode }) {
  return <ul className="mb-3 list-disc space-y-1 break-words pl-5 text-sm leading-7 text-slate-600 sm:text-[15px]">{children}</ul>;
}
