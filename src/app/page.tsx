"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, MotionConfig, motion, useInView, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { AlertTriangle, ArrowRight, Check, ImageIcon, Moon, Sun } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme";
import { Logo } from "@/components/Logo";

const palt = { fontFeatureSettings: '"palt"' } as const;
const jp = { wordBreak: "auto-phrase", textWrap: "pretty" } as unknown as React.CSSProperties;
const field = "w-full rounded-lg border border-slate-200 p-2.5 text-[15px] text-slate-700 placeholder:text-slate-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";
const chip = "rounded-full px-2 py-0.5 text-xs";
const ease = [0.22, 1, 0.36, 1] as const;

// ============ 動きの部品 ============
// スクロールで画面に入ったとき、一度だけ、ふわっと現れる
function Reveal({ children, delay = 0, className = "", y = 18 }: { children: React.ReactNode; delay?: number; className?: string; y?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className} initial={reduce ? false : { opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.6, delay, ease }}>
      {children}
    </motion.div>
  );
}

// 背景の点。カーソルのまわりだけ、点が光る（動きを減らす設定のときは、光らない）
function DotGrid() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    const host = ref.current?.parentElement;
    if (!host) return;
    let raf = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = host.getBoundingClientRect();
        ref.current?.style.setProperty("--mx", `${e.clientX - r.left}px`);
        ref.current?.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    };
    host.addEventListener("pointermove", move);
    return () => { host.removeEventListener("pointermove", move); cancelAnimationFrame(raf); };
  }, [reduce]);
  const dots = (color: string, size: string) => ({ backgroundImage: `radial-gradient(${color} ${size}, transparent calc(${size} + 0.5px))`, backgroundSize: "22px 22px" });
  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0" style={{ "--mx": "50%", "--my": "20%" } as React.CSSProperties}>
      <div className="absolute inset-0" style={{ ...dots("rgb(var(--slate-300) / 0.55)", "1px"), maskImage: "linear-gradient(to bottom, black 0%, transparent 70%)", WebkitMaskImage: "linear-gradient(to bottom, black 0%, transparent 70%)" }} />
      {!reduce && (
        <div className="absolute inset-0" style={{ ...dots("rgb(var(--accent) / 0.95)", "1.3px"), maskImage: "radial-gradient(180px circle at var(--mx) var(--my), black, transparent)", WebkitMaskImage: "radial-gradient(180px circle at var(--mx) var(--my), black, transparent)" }} />
      )}
    </div>
  );
}

// ============ 製品の画面（体験用）：画面の中のタブを押すと、実際に触れる ============
type TabId = "write" | "list" | "order" | "print";
const tabs: { id: TabId; label: string }[] = [
  { id: "write", label: "作問" },
  { id: "list", label: "問題" },
  { id: "order", label: "出題順" },
  { id: "print", label: "印刷" },
];

// --- 作問：Ctrl/⌘+Enter で保存して次へ。内容は保存されない ---
interface Saved { id: number; body: string; answer: string }

function WritePane() {
  const [items, setItems] = useState<Saved[]>([
    { id: 2, body: "琵琶湖がある都道府県はどこでしょう？", answer: "滋賀県" },
    { id: 1, body: "元素記号Auで表される元素は何でしょう？", answer: "金" },
  ]);
  const [body, setBody] = useState("日本で最も面積の大きい都道府県はどこでしょう？");
  const [answer, setAnswer] = useState("北海道");
  const [saved, setSaved] = useState(0);
  const nextId = useRef(3);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const empty = !body.trim() && !answer.trim();

  function save() {
    if (empty) return;
    setItems((l) => [{ id: nextId.current++, body: body.trim(), answer: answer.trim() }, ...l].slice(0, 4));
    setBody("");
    setAnswer("");
    setSaved((n) => n + 1);
    bodyRef.current?.focus();
  }

  return (
    <div
      className="grid lg:min-h-[27rem] lg:grid-cols-[1.15fr_1fr]"
      onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); save(); } }}
    >
      <div className="p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
          <span>新しい問題</span>
          <AnimatePresence mode="wait">
            {saved > 0 && <motion.span key={saved} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-ok" role="status">今回 {saved} 問を保存しました</motion.span>}
          </AnimatePresence>
        </div>
        <label htmlFor="demo-body" className="mb-1 block text-xs text-slate-400">問題文</label>
        <textarea id="demo-body" ref={bodyRef} value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="問題文を入力" className={`${field} mb-3 resize-none leading-relaxed`} />
        <label htmlFor="demo-answer" className="mb-1 block text-xs text-slate-400">解答</label>
        <textarea id="demo-answer" value={answer} onChange={(e) => setAnswer(e.target.value)} rows={1} placeholder="解答" className={`${field} mb-4 resize-none font-medium text-accent`} />
        <div className="flex flex-wrap items-center gap-3">
          <motion.button whileTap={{ scale: 0.96 }} onClick={save} disabled={empty} className="min-h-[40px] rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40">保存して次へ</motion.button>
          <span className="hidden font-mono text-[11px] text-slate-400 sm:inline">Ctrl / ⌘ + Enter</span>
        </div>
      </div>
      <div className="border-t border-slate-100 p-4 sm:p-5 lg:border-l lg:border-t-0">
        <p className="mb-2 text-xs text-slate-400">最近作成した問題</p>
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {items.map((q) => (
              <motion.li key={q.id} layout initial={{ opacity: 0, y: -14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ type: "spring", stiffness: 420, damping: 32 }} className="rounded-lg border border-slate-200 bg-surface p-3 text-sm">
                <p className="line-clamp-2 break-words text-slate-700">{q.body || "（問題文なし）"}</p>
                <p className="flex items-center justify-between gap-2">
                  <span className="truncate text-accent">{q.answer || "（解答なし）"}</span>
                  <span className={`${chip} shrink-0 bg-slate-100 text-slate-500`}>下書き</span>
                </p>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        <p className="mt-3 text-xs text-slate-400">体験用の画面です。入力した内容は保存されません。</p>
      </div>
    </div>
  );
}

// --- 問題：一覧から、そのまま採用・却下できる ---
type Judge = "adopted" | "rejected" | "undecided";
interface QRow { id: number; genre: string; round: string; body: string; answer: string; author: string; judge: Judge; proof: "approved" | "in_review" | "unchecked" | "needs_fix"; images?: number }
const judgeChip: Record<Judge, [string, string]> = {
  adopted: ["採用", "bg-emerald-50 text-ok"],
  rejected: ["却下", "bg-rose-50 text-danger"],
  undecided: ["未判定", "bg-slate-100 text-slate-500"],
};
const proofChip = {
  approved: ["確認済み", "bg-brand-50 text-accent"],
  in_review: ["確認中", "bg-sky-50 text-info"],
  unchecked: ["未着手", "bg-amber-50 text-warn"],
  needs_fix: ["要修正", "bg-rose-50 text-danger"],
} as const;

function ListPane() {
  const [rows, setRows] = useState<QRow[]>([
    { id: 1, genre: "地理", round: "Round 1", body: "日本で最も面積の大きい都道府県はどこでしょう？", answer: "北海道", author: "山田", judge: "adopted", proof: "approved" },
    { id: 2, genre: "地理", round: "Round 1", body: "この国旗は、どこの国のものでしょう？", answer: "日本", author: "佐藤", judge: "undecided", proof: "in_review", images: 1 },
    { id: 3, genre: "歴史", round: "Round 1", body: "関ヶ原の戦いが起きたのは西暦何年でしょう？", answer: "1600年", author: "山田", judge: "undecided", proof: "unchecked" },
    { id: 4, genre: "歴史", round: "Round 2", body: "鎌倉幕府を開いた人物は誰でしょう？", answer: "源頼朝", author: "鈴木", judge: "rejected", proof: "needs_fix" },
  ]);
  const set = (id: number, j: Judge) => setRows((r) => r.map((x) => (x.id === id ? { ...x, judge: x.judge === j ? "undecided" : j } : x)));
  return (
    <div className="p-4 sm:p-5 lg:min-h-[27rem]">
      <div className="mb-3 flex gap-2">
        <div className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-300">問題文・解答・解説・出典・作成者を検索</div>
        <div className="hidden rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-500 sm:block">絞り込み</div>
      </div>
      <ul className="space-y-2">
        {rows.map((q, i) => (
          <motion.li key={q.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.3 }} className="rounded-lg border border-slate-200 bg-surface text-sm">
            <div className="flex flex-col gap-1.5 p-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
              <div className="min-w-0">
                <p className="mb-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-300">
                  <span className="font-mono">#{i + 1}</span>
                  <span className={`${chip} bg-slate-100 text-slate-500`}>{q.genre}</span>
                  <span className={`${chip} bg-violet-50 text-tag`}>{q.round}</span>
                  {q.images && <span className={`${chip} flex items-center gap-1 bg-slate-100 text-slate-500`}><ImageIcon size={11} aria-hidden />{q.images}</span>}
                </p>
                <p className="break-words text-slate-700">{q.body}</p>
                <p className="text-accent">{q.answer}</p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-1.5 text-xs sm:flex-col sm:items-end">
                <span className="text-slate-400">{q.author}</span>
                <span className="flex gap-1">
                  <motion.span key={q.judge} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 500, damping: 22 }} className={`${chip} ${judgeChip[q.judge][1]}`}>{judgeChip[q.judge][0]}</motion.span>
                  <span className={`${chip} ${proofChip[q.proof][1]}`}>{proofChip[q.proof][0]}</span>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 border-t border-slate-100 px-3 py-1.5">
              <button onClick={() => set(q.id, "adopted")} className={`rounded-md px-2.5 py-1.5 text-xs transition ${q.judge === "adopted" ? "bg-emerald-600 text-white" : "text-ok hover:bg-emerald-50"}`}>採用</button>
              <button onClick={() => set(q.id, "rejected")} className={`rounded-md px-2.5 py-1.5 text-xs transition ${q.judge === "rejected" ? "bg-rose-500 text-white" : "text-danger hover:bg-rose-50"}`}>却下</button>
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

// --- 出題順：ジャンルが続かないように、ルールを考慮して並べ替える。行が実際に動く ---
interface Row { q: string; genre: string }
const BEFORE: Row[] = [
  { q: "日本で最も面積の大きい都道府県は？", genre: "地理" },
  { q: "琵琶湖がある都道府県は？", genre: "地理" },
  { q: "関ヶ原の戦いは西暦何年？", genre: "歴史" },
  { q: "鎌倉幕府を開いた人物は？", genre: "歴史" },
  { q: "元素記号Auの元素は？", genre: "科学" },
];
const AFTER: Row[] = [BEFORE[0], BEFORE[2], BEFORE[4], BEFORE[1], BEFORE[3]];

function OrderPane() {
  const [sorted, setSorted] = useState(false);
  const rows = sorted ? AFTER : BEFORE;
  const bad = new Set<number>();
  rows.forEach((r, i) => { if (i > 0 && rows[i - 1].genre === r.genre) bad.add(i); });
  return (
    <div className="p-4 sm:p-5 lg:min-h-[27rem]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500"><span className="font-mono text-xs text-slate-400">Round 1</span>　{rows.length}問</p>
        <motion.button whileTap={{ scale: 0.96 }} onClick={() => setSorted((v) => !v)} className="min-h-[36px] rounded-lg border border-slate-200 bg-surface px-3 text-xs text-slate-600 hover:border-brand-300 hover:text-accent">
          {sorted ? "元に戻す" : "ルールを考慮してシャッフル"}
        </motion.button>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        {bad.size > 0 ? (
          <motion.p key="bad" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-3 flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-warn-strong" role="status"><AlertTriangle size={13} />ルール違反 {bad.size}件（同じジャンルが連続しています）</motion.p>
        ) : (
          <motion.p key="ok" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-3 flex items-center gap-1 px-1 py-2 text-xs text-ok" role="status"><Check size={13} />ルール違反はありません</motion.p>
        )}
      </AnimatePresence>
      <ol className="space-y-2">
        {rows.map((r, i) => (
          <motion.li layout transition={{ type: "spring", stiffness: 380, damping: 34 }} key={r.q} className={`flex items-center gap-3 rounded-lg border p-2.5 text-sm transition-colors duration-500 ${bad.has(i) ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-surface"}`}>
            <span className="w-6 shrink-0 text-center font-mono text-xs text-slate-400">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate text-slate-700">{r.q}</span>
            <span className={`${chip} shrink-0 bg-slate-100 text-slate-500`}>{r.genre}</span>
          </motion.li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-slate-400" style={jp}>条件によっては、違反をすべて解消できないこともあります。その場合は、残った違反が表示されます。</p>
    </div>
  );
}

// --- 印刷：問題用紙と解答付き。紙の色は固定（画面の配色に左右されない）---
function PrintPane() {
  const [withAnswer, setWithAnswer] = useState(false);
  const qs = [
    { q: "日本で最も面積の大きい都道府県はどこでしょう？", a: "北海道", flag: false },
    { q: "この国旗は、どこの国のものでしょう？", a: "日本", flag: true },
    { q: "関ヶ原の戦いが起きたのは西暦何年でしょう？", a: "1600年", flag: false },
  ];
  return (
    <div className="grid gap-5 p-4 sm:p-5 lg:min-h-[27rem] lg:grid-cols-[14rem_1fr]">
      <div>
        <p className="mb-2 text-xs text-slate-400">出力の種類</p>
        <div className="flex gap-1.5 lg:flex-col">
          {[["問題用紙", false], ["解答付き", true]].map(([l, v]) => (
            <button key={String(l)} onClick={() => setWithAnswer(v as boolean)} aria-pressed={withAnswer === v} className={`min-h-[40px] flex-1 rounded-lg border px-3 text-sm transition ${withAnswer === v ? "border-brand-400 bg-brand-50 text-accent" : "border-slate-200 text-slate-600 hover:border-brand-300"}`}>{l as string}</button>
          ))}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-400" style={jp}>印刷画面で「PDFに保存」を選ぶと、PDFにできます。画像もそのまま入ります。</p>
      </div>
      <motion.div initial={{ opacity: 0, y: 14, rotate: -0.6 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ duration: 0.45, ease }} className="rounded-md bg-[#ffffff] p-5 text-[#111827] shadow-card sm:p-7">
        <p className="border-b border-[#d1d5db] pb-2 text-sm font-semibold">第10回 ○○クイズ大会</p>
        <p className="mb-4 pt-1 text-xs text-[#6b7280]">Round 1　{withAnswer ? "解答付き" : "問題用紙"}　全3問</p>
        <ol className="space-y-4 text-sm">
          {qs.map((x, i) => (
            <li key={x.q}>
              <p className="flex gap-2"><span className="font-semibold">{i + 1}.</span><span>{x.q}</span></p>
              {x.flag && (
                <svg viewBox="0 0 30 20" role="img" aria-label="日の丸の国旗" className="ml-6 mt-2 w-24 border border-[#d1d5db]"><rect width="30" height="20" fill="#fff" /><circle cx="15" cy="10" r="6" fill="#bc002d" /></svg>
              )}
              <AnimatePresence initial={false}>
                {withAnswer && (
                  <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25, delay: i * 0.07 }} className="ml-6 overflow-hidden font-medium">
                    <span className="block pt-1">正解：{x.a}</span>
                  </motion.p>
                )}
              </AnimatePresence>
            </li>
          ))}
        </ol>
      </motion.div>
    </div>
  );
}

function AppWindow() {
  const [tab, setTab] = useState<TabId>("write");
  function onKey(e: React.KeyboardEvent) {
    const i = tabs.findIndex((t) => t.id === tab);
    if (e.key === "ArrowRight") setTab(tabs[(i + 1) % tabs.length].id);
    else if (e.key === "ArrowLeft") setTab(tabs[(i - 1 + tabs.length) % tabs.length].id);
    else return;
    e.preventDefault();
  }
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-surface shadow-pop">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5">
        <Logo size={18} />
        <span className="truncate text-sm font-medium text-slate-700">第10回 ○○クイズ大会</span>
      </div>
      <div role="tablist" aria-label="画面の切り替え" onKeyDown={onKey} className="flex gap-1 overflow-x-auto border-b border-slate-100 px-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`pane-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            className={`relative shrink-0 px-3 py-2.5 text-sm transition-colors ${tab === t.id ? "font-medium text-slate-800" : "text-slate-400 hover:text-slate-600"}`}
          >
            {t.label}
            {tab === t.id && <motion.span layoutId="tab-underline" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-500" transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={tab} role="tabpanel" id={`pane-${tab}`} aria-labelledby={`tab-${tab}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
          {tab === "write" && <WritePane />}
          {tab === "list" && <ListPane />}
          {tab === "order" && <OrderPane />}
          {tab === "print" && <PrintPane />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// 画面に入るとき、スクロールに合わせて、少し傾いた状態から正面を向く
function TiltIn({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 0.35"] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [10, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.93, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [36, 0]);
  return (
    <motion.div ref={ref} style={reduce ? undefined : { rotateX, scale, y, transformPerspective: 1400, transformOrigin: "50% 0%" }}>
      {children}
    </motion.div>
  );
}

// ============ 機能の断片：説明ではなく、実物の一部を見せる。それぞれ、その機能らしい動きをする ============
function Tile({ title, text, className = "", delay = 0, children }: { title: string; text: string; className?: string; delay?: number; children: React.ReactNode }) {
  return (
    <Reveal delay={delay} className={className}>
      <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }} className="flex h-full flex-col rounded-xl border border-slate-200 bg-surface p-5 transition-colors hover:border-brand-300">
        <div className="mb-4 flex min-h-[5.5rem] flex-1 items-center">{children}</div>
        <h3 className="font-semibold text-slate-800">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-500" style={jp}>{text}</p>
      </motion.div>
    </Reveal>
  );
}

// 検索：文字が入力され、条件の絞り込みが現れる
function SearchAnim() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.5 });
  const word = "さいたま";
  const [n, setN] = useState(reduce ? word.length : 0);
  const [chips, setChips] = useState(reduce ? 4 : 0);
  useEffect(() => {
    if (reduce || !inView) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const wait = (ms: number) => new Promise<void>((r) => { timer = setTimeout(r, ms); });
    (async () => {
      while (alive) {
        setN(0); setChips(0);
        await wait(500);
        for (let k = 1; k <= word.length && alive; k++) { setN(k); await wait(240); }
        await wait(260);
        for (let c = 1; c <= 4 && alive; c++) { setChips(c); await wait(200); }
        await wait(2800);
      }
    })();
    return () => { alive = false; clearTimeout(timer); };
  }, [inView, reduce]);
  const list: [string, string][] = [["地理", "bg-slate-100 text-slate-500"], ["Round 1", "bg-violet-50 text-tag"], ["未判定", "bg-slate-100 text-slate-500"], ["裏どり：未着手", "bg-amber-50 text-warn"]];
  return (
    <div ref={ref} className="w-full">
      <div className="mb-2 flex min-h-[38px] items-center rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600">
        {word.slice(0, n)}
        {!reduce && <span className="ml-px inline-block h-4 w-px animate-pulse bg-slate-500" />}
      </div>
      <div className="flex min-h-[26px] flex-wrap gap-1.5 text-xs">
        <AnimatePresence>
          {list.slice(0, chips).map(([l, c]) => (
            <motion.span key={l} initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ type: "spring", stiffness: 500, damping: 24 }} className={`${chip} ${c}`}>{l}</motion.span>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// 裏どり：未着手 → 確認中 → 確認済み、と進んでいく
function ProofAnim() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.5 });
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (reduce || !inView) return;
    const id = setInterval(() => setStep((s) => (s + 1) % 4), 1100);
    return () => clearInterval(id);
  }, [inView, reduce]);
  const items: [string, string][] = [["未着手", proofChip.unchecked[1]], ["確認中", proofChip.in_review[1]], ["確認済み", proofChip.approved[1]], ["要修正", proofChip.needs_fix[1]], ["保留", "bg-slate-100 text-slate-500"]];
  const active = [0, 1, 2, 2][step];
  return (
    <div ref={ref} className="flex flex-wrap gap-1.5 text-xs">
      {items.map(([l, c], i) => (
        <motion.span key={l} animate={{ scale: i === active ? 1.12 : 1, opacity: i > 2 || i === active ? (i === active ? 1 : 0.55) : 0.55 }} transition={{ type: "spring", stiffness: 380, damping: 22 }} className={`${chip} ${c} ${i === active ? "ring-2 ring-brand-300" : ""}`}>{l}</motion.span>
      ))}
    </div>
  );
}

const roles = ["管理者", "問題統括", "作問者", "裏どり担当", "閲覧者"];

function Features() {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <Tile className="lg:col-span-2" title="検索と絞り込み" text="問題文・解答・解説・出典・作成者を横断して検索。ひらがな／カタカナ、全角／半角の違いは区別しません。">
        <SearchAnim />
      </Tile>
      <Tile delay={0.08} title="裏どり" text="担当を割り当て、確認の進み具合を一覧で把握できます。">
        <ProofAnim />
      </Tile>
      <Tile delay={0.04} title="画像つきの問題" text="問題文・解答・解説に画像を付けられます。貼り付けでも追加できます。">
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div key={i} initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.25 + i * 0.12, duration: 0.45, ease }} whileHover={{ y: -4, rotate: i === 1 ? 0 : i === 0 ? -3 : 3 }} className="flex h-14 w-16 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-100">
              <svg viewBox="0 0 30 20" aria-hidden className="w-full">
                {i === 0 && <><rect width="30" height="20" fill="#fff" /><circle cx="15" cy="10" r="6" fill="#bc002d" /></>}
                {i === 1 && <><rect width="30" height="20" fill="#bfdbfe" /><path d="M0 20 L8 9 L14 15 L21 5 L30 20 Z" fill="#64748b" /></>}
                {i === 2 && <><rect width="30" height="20" fill="#fde68a" /><circle cx="15" cy="10" r="5" fill="#f59e0b" /></>}
              </svg>
            </motion.div>
          ))}
        </div>
      </Tile>
      <Tile delay={0.08} title="5つの役割" text="できることは、役割ごとに決まっています。">
        <div className="flex flex-wrap gap-1.5 text-xs">
          {roles.map((r, i) => (
            <motion.span key={r} initial={{ opacity: 0, scale: 0.7 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 + i * 0.07, type: "spring", stiffness: 420, damping: 22 }} className={`${chip} bg-slate-100 text-slate-600`}>{r}</motion.span>
          ))}
        </div>
      </Tile>
      <Tile delay={0.12} title="取り込みと書き出し" text="Excel（.xlsx）とCSVに対応。取り込み前に内容を確認します。">
        <div className="flex items-center gap-2 font-mono text-xs text-slate-500">
          <span className="flex flex-col gap-1">
            <span className="rounded-md border border-slate-200 px-2 py-1">.xlsx</span>
            <span className="rounded-md border border-slate-200 px-2 py-1">.csv</span>
          </span>
          <span className="relative h-px w-14 bg-slate-200" aria-hidden>
            <motion.span className="absolute -top-[2px] h-[5px] w-[5px] rounded-full bg-brand-500" animate={{ left: ["0%", "100%"], opacity: [0, 1, 1, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }} />
          </span>
          <span className="rounded-md border border-brand-300 px-2 py-1 text-accent">Qraft</span>
        </div>
      </Tile>
    </div>
  );
}

// よくある質問：なめらかに開閉する
const faqs = [
  { q: "ログインには何が必要ですか？", a: "Googleアカウントでログインします。メールアドレスとパスワードを、新しく登録する必要はありません。" },
  { q: "スマホでも使えますか？", a: "はい。画面の幅に合わせて表示が切り替わるので、スマホでも作問や確認ができます。" },
  { q: "すでにExcelで持っている問題を使えますか？", a: "Excel（.xlsx）やCSVを取り込めます。取り込み前に内容をチェックして、問題のある行は取り込まれません。テンプレートもダウンロードできます。" },
  { q: "画像は何枚まで付けられますか？", a: "1問につき6枚までです（問題文・解答・解説の合計）。大きな画像は、追加するときに自動で縮小されます。" },
  { q: "印刷やPDFにできますか？", a: "採用した問題を、問題用紙と解答付きで印刷できます。印刷画面で「PDFに保存」を選ぶと、PDFになります。" },
];

function FaqItem({ q, a, id }: { q: string; a: string; id: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="py-1">
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls={id} className="flex w-full items-center justify-between gap-4 py-3 text-left font-medium text-slate-800">
        <span style={jp}>{q}</span>
        <motion.span aria-hidden animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }} className="shrink-0 font-mono text-slate-400">+</motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={id} role="region" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease }} className="overflow-hidden">
            <p className="pb-3 text-sm leading-relaxed text-slate-500" style={jp}>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ThemeButton() {
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

// 見出しの1行。下から、行ごとに現れる
function HeadLine({ children, delay }: { children: React.ReactNode; delay: number }) {
  const reduce = useReducedMotion();
  return (
    <span className="block overflow-hidden pb-[0.12em]">
      <motion.span className="block" initial={reduce ? false : { y: "105%" }} animate={{ y: 0 }} transition={{ duration: 0.75, delay, ease }}>{children}</motion.span>
    </span>
  );
}

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 12));

  useEffect(() => {
    if (loading || !user) return;
    router.replace("/dashboard");
  }, [user, loading, router]);

  // ページ内リンク（機能・よくある質問）をなめらかに動かす
  useEffect(() => {
    if (reduce) return;
    const el = document.documentElement;
    const prev = el.style.scrollBehavior;
    el.style.scrollBehavior = "smooth";
    return () => { el.style.scrollBehavior = prev; };
  }, [reduce]);

  if (loading || user) return null;

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-slate-50">
        <header className={`sticky top-0 z-40 border-b transition-colors duration-300 ${scrolled ? "border-slate-200 bg-slate-50/80 backdrop-blur-md" : "border-transparent"}`}>
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2.5">
              <Logo size={28} />
              <span className="font-semibold text-slate-800">Qraft</span>
            </div>
            <nav className="flex items-center gap-1 sm:gap-2" aria-label="ページ内">
              <a href="#features" className="hidden rounded-lg px-3 py-2 text-sm text-slate-500 hover:text-slate-800 sm:block">機能</a>
              <a href="#faq" className="hidden rounded-lg px-3 py-2 text-sm text-slate-500 hover:text-slate-800 sm:block">よくある質問</a>
              <ThemeButton />
              <Link href="/login" className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:text-slate-800">ログイン</Link>
              <Link href="/signup" className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 sm:px-4">無料で始める</Link>
            </nav>
          </div>
        </header>

        <section className="relative">
          <DotGrid />
          <div className="relative mx-auto max-w-5xl px-4 pb-16 pt-12 sm:px-6 sm:pt-20 lg:pb-24">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="text-[2rem] font-bold leading-[1.2] tracking-[-0.02em] text-slate-900 sm:text-5xl" style={palt}>
                <HeadLine delay={0.05}>作問から本番まで、</HeadLine>
                <HeadLine delay={0.18}>一つの画面で。</HeadLine>
              </h1>
              <motion.p initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5, ease }} className="mx-auto mt-4 max-w-lg text-slate-500 sm:text-lg" style={jp}>
                競技クイズの問題づくりに特化した、チームのための専用エディタ。
              </motion.p>
              <motion.div initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.62, ease }} className="mt-7 flex flex-wrap justify-center gap-3">
                <Link href="/signup" className="group flex min-h-[44px] items-center gap-1.5 rounded-lg bg-brand-600 px-5 text-sm font-medium text-white hover:bg-brand-700">
                  無料で始める
                  <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
                </Link>
                <Link href="/login" className="flex min-h-[44px] items-center rounded-lg border border-slate-200 bg-surface px-5 text-sm font-medium text-slate-600 hover:border-brand-300 hover:text-accent">ログイン</Link>
              </motion.div>
            </div>
            <motion.div className="mt-12 sm:mt-16" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.7 }}>
              <TiltIn>
                <AppWindow />
              </TiltIn>
              <p className="mt-3 text-center text-xs text-slate-400">上のタブを切り替えて、実際に触れます（体験用の画面です）。</p>
            </motion.div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-5xl scroll-mt-16 px-4 py-14 sm:px-6 sm:py-20">
          <Reveal><h2 className="mb-8 text-2xl font-bold leading-snug tracking-[-0.01em] text-slate-900 sm:text-3xl" style={palt}>作問に必要なことを、ひとつに。</h2></Reveal>
          <Features />
        </section>

        <section id="faq" className="mx-auto max-w-3xl scroll-mt-16 px-4 pb-14 sm:px-6 sm:pb-20">
          <Reveal><h2 className="mb-6 text-2xl font-bold leading-snug tracking-[-0.01em] text-slate-900 sm:text-3xl" style={palt}>よくある質問</h2></Reveal>
          <Reveal delay={0.08}>
            <div className="divide-y divide-slate-200 border-y border-slate-200">
              {faqs.map((f, i) => <FaqItem key={f.q} q={f.q} a={f.a} id={`faq-${i}`} />)}
            </div>
          </Reveal>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 sm:pb-24">
          <Reveal>
            <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-surface px-6 py-10 text-center sm:py-14">
              <DotGrid />
              <h2 className="relative text-2xl font-bold leading-snug tracking-[-0.01em] text-slate-900 sm:text-3xl" style={palt}>最初の一問を、書きはじめよう。</h2>
              <p className="relative mx-auto mt-3 max-w-md text-slate-500" style={jp}>Googleアカウントで、すぐに始められます。</p>
              <Link href="/signup" className="group relative mt-6 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-brand-600 px-6 text-sm font-medium text-white hover:bg-brand-700">
                無料で始める
                <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
              </Link>
            </div>
          </Reveal>
        </section>

        <footer className="mx-auto flex max-w-5xl items-center gap-2 px-4 pb-10 text-xs text-slate-400 sm:px-6">
          <Logo size={16} />
          <span>Qraft — クイズ作問エディタ</span>
        </footer>
      </div>
    </MotionConfig>
  );
}
