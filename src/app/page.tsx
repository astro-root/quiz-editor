"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Moon, Sun } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme";
import { Logo } from "@/components/Logo";

const palt = { fontFeatureSettings: '"palt"' } as const;
const jp = { wordBreak: "auto-phrase", textWrap: "pretty" } as unknown as React.CSSProperties;
const field = "w-full rounded-lg border border-slate-200 p-2.5 text-base text-slate-700 placeholder:text-slate-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";
const h2 = "text-2xl font-bold leading-snug text-slate-900 sm:text-3xl";

// ---- 体験デモ：実際の作問画面と同じ操作（Ctrl/⌘+Enterで保存して次へ）。内容は保存されない ----
interface DemoItem { id: number; body: string; answer: string }

function QuickDemo() {
  const [items, setItems] = useState<DemoItem[]>([
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
      onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); save(); } }}
      className="rounded-2xl border border-slate-200 bg-surface p-4 shadow-pop sm:p-5"
    >
      <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
        <span>新しい問題</span>
        {saved > 0 && <span className="text-ok" role="status">今回 {saved} 問を保存しました</span>}
      </div>
      <label htmlFor="demo-body" className="mb-1 block text-xs text-slate-400">問題文</label>
      <textarea id="demo-body" ref={bodyRef} value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="問題文を入力" className={`${field} mb-3 resize-none leading-relaxed`} />
      <label htmlFor="demo-answer" className="mb-1 block text-xs text-slate-400">解答</label>
      <textarea id="demo-answer" value={answer} onChange={(e) => setAnswer(e.target.value)} rows={1} placeholder="解答" className={`${field} mb-4 resize-none font-medium text-accent`} />
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={save} disabled={empty} className="min-h-[44px] rounded-lg bg-brand-600 px-5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40">保存して次へ</button>
        <span className="hidden text-xs text-slate-400 sm:inline">
          <kbd className="rounded border border-slate-200 px-1.5 py-0.5 text-[11px]">Ctrl / ⌘</kbd>
          <span className="mx-1">+</span>
          <kbd className="rounded border border-slate-200 px-1.5 py-0.5 text-[11px]">Enter</kbd>
        </span>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <p className="mb-2 text-xs font-medium text-slate-400">最近作成した問題</p>
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {items.map((q) => (
              <motion.li
                key={q.id}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="rounded-xl border border-slate-200 bg-surface p-3 text-sm"
              >
                <p className="line-clamp-2 break-words text-slate-700">{q.body || "（問題文なし）"}</p>
                <p className="flex items-center justify-between gap-2">
                  <span className="truncate text-accent">{q.answer || "（解答なし）"}</span>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">下書き</span>
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

// ---- 出題順ルールのデモ：連続を検出して、並べ替えで解消する ----
interface Row { q: string; genre: string }
const BEFORE: Row[] = [
  { q: "日本一長い川は？", genre: "地理" },
  { q: "世界最大の砂漠は？", genre: "地理" },
  { q: "関ヶ原の戦いは西暦何年？", genre: "歴史" },
  { q: "鎌倉幕府を開いた人物は？", genre: "歴史" },
  { q: "水の化学式は？", genre: "科学" },
];
const AFTER: Row[] = [BEFORE[0], BEFORE[2], BEFORE[4], BEFORE[1], BEFORE[3]];

function OrderDemo() {
  const [sorted, setSorted] = useState(false);
  const rows = sorted ? AFTER : BEFORE;
  const bad = new Set<number>();
  rows.forEach((r, i) => { if (i > 0 && rows[i - 1].genre === r.genre) bad.add(i); });
  return (
    <div className="rounded-2xl border border-slate-200 bg-surface p-4 shadow-card sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500">{rows.length}問</p>
        <button
          onClick={() => setSorted((v) => !v)}
          className="min-h-[40px] rounded-lg border border-slate-200 bg-surface px-3 text-xs text-slate-600 hover:border-brand-300 hover:text-accent"
        >
          {sorted ? "元に戻す" : "ルールを考慮してシャッフル"}
        </button>
      </div>
      {bad.size > 0 ? (
        <p className="mb-3 flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-warn-strong" role="status">
          <AlertTriangle size={13} />ルール違反 {bad.size}件（同じジャンルが連続しています）
        </p>
      ) : (
        <p className="mb-3 px-1 text-xs text-ok" role="status">ルール違反はありません</p>
      )}
      <ol className="space-y-2">
        {rows.map((r, i) => (
          <li key={r.q} className={`flex items-center gap-3 rounded-xl border p-2.5 text-sm ${bad.has(i) ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-surface"}`}>
            <span className="w-6 shrink-0 text-center text-xs font-medium text-slate-400">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate text-slate-700">{r.q}</span>
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{r.genre}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ---- 画像つきの問題（ビジュアルクイズ）の見本。絵は読み込まずに、その場で描く ----
function VisualSample() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-surface p-4 shadow-card sm:p-5">
      <p className="mb-2 text-xs text-slate-400">問題文</p>
      <p className="mb-3 text-slate-700">この山の名前は何でしょう？</p>
      <svg viewBox="0 0 320 170" role="img" aria-label="雪をかぶった山と朝日のイラスト" className="mb-3 w-full overflow-hidden rounded-lg border border-slate-200">
        <rect width="320" height="170" fill="#bfdbfe" />
        <circle cx="244" cy="46" r="20" fill="#fde68a" />
        <path d="M0 170 L0 128 L70 96 L120 122 L190 66 L226 60 L320 134 L320 170 Z" fill="#94a3b8" />
        <path d="M0 170 L0 150 L90 118 L150 140 L200 100 L260 130 L320 112 L320 170 Z" fill="#64748b" />
        <path d="M190 66 L226 60 L240 76 L226 72 L214 84 L204 74 L196 82 Z" fill="#fff" />
      </svg>
      <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-sm">
        <span className="text-slate-400">解答</span>
        <span className="font-medium text-accent">富士山</span>
      </div>
    </div>
  );
}

const flow = [
  { title: "作問", who: "作問者", body: "問題文・解答・別解・解説・出典を書いて、保存して次へ。同じ問題文があれば警告します。" },
  { title: "裏どり", who: "裏どり担当", body: "担当を割り当て、出典を確認。未着手・確認中・確認済み・要修正・保留で進み具合を管理します。" },
  { title: "判定", who: "問題統括", body: "一覧からそのまま採用・却下を選べます。状態の変更は履歴に残ります。" },
  { title: "出題順", who: "問題統括", body: "Roundごとにドラッグで並べ替え。ジャンルや作問者が続かないよう、ルールを考慮してシャッフルもできます。" },
  { title: "出力", who: "全員", body: "問題用紙と解答付きを印刷・PDFに。Excel／CSVでの書き出しと取り込みにも対応します。" },
];

const scenes = [
  { title: "大会の準備に", body: "採用した問題をRoundごとに並べて、問題用紙と解答付きをそのまま印刷。本番に使う順番を、チームで共有できます。" },
  { title: "例会の問題づくりに", body: "みんなで問題を持ち寄り、重複を確かめながら一つのセットに。誰がどの問題を書いたかも、一覧で分かります。" },
  { title: "問題の確認に", body: "出典を確かめる担当を割り当てて、確認済みかどうかを一覧で把握。直すべき問題は「要修正」で見分けられます。" },
];

const extras = [
  { term: "検索と絞り込み", desc: "問題文・解答・解説・出典・作成者を横断して検索。ひらがな／カタカナ、全角／半角の違いは区別しません。ジャンル、Round、採用状態、裏どり状態でも絞れます。" },
  { term: "役割", desc: "管理者・問題統括・作問者・裏どり担当・閲覧者の5つ。それぞれができることは決まっていて、メンバーの招待や役割の変更は管理者が行います。" },
  { term: "履歴とコメント", desc: "問題ごとにコメントを残せます。採用や裏どりの変更履歴、問題文と解答の改訂履歴も確認できます。" },
  { term: "取り込みと書き出し", desc: "Excel（.xlsx）とCSVから問題を取り込めます。取り込み前に内容を確認し、問題のある行は取り込まれません。テンプレートも用意しています。" },
  { term: "問題が増えても", desc: "一覧は表示している分だけを描画するので、問題数が増えても動きが重くなりにくい作りです。" },
  { term: "ライトとダーク", desc: "表示は、ライト・ダーク・システムに合わせる、から選べます。パソコンでもスマホでも、画面の幅に合わせて表示が切り替わります。" },
];

const faqs = [
  { q: "スマホでも使えますか？", a: "はい。画面の幅に合わせて表示が切り替わるので、スマホでも作問や確認ができます。" },
  { q: "すでにExcelで持っている問題を使えますか？", a: "Excel（.xlsx）やCSVを取り込めます。取り込み前に内容をチェックして、問題のある行は取り込まれません。テンプレートもダウンロードできます。" },
  { q: "画像は何枚まで付けられますか？", a: "1問につき6枚までです（問題文・解答・解説の合計）。大きな画像は、保存するときに自動で縮小されます。" },
  { q: "印刷やPDFにできますか？", a: "採用した問題を、問題用紙と解答付きで印刷できます。印刷画面で「PDFに保存」を選ぶと、PDFになります。" },
];

const verbs = ["書く。", "確かめる。", "並べる。", "出す。"];

function ThemeButton() {
  const { resolved, setPreference } = useTheme();
  return (
    <button
      type="button"
      onClick={() => setPreference(resolved === "dark" ? "light" : "dark")}
      aria-label={resolved === "dark" ? "ライトモードに切り替え" : "ダークモードに切り替え"}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
    >
      {resolved === "dark" ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;
    router.replace("/dashboard");
  }, [user, loading, router]);

  if (loading || user) return null;

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-slate-50">
        <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-center gap-2.5">
            <Logo size={32} />
            <span className="text-lg font-semibold text-slate-800">Qraft</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeButton />
            <Link href="/login" className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:text-slate-800">ログイン</Link>
            <Link href="/signup" className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 sm:px-4">無料で始める</Link>
          </div>
        </header>

        <section className="mx-auto grid max-w-5xl items-start gap-10 px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:grid-cols-[1fr_26rem] lg:gap-14 lg:pb-24">
          <div className="lg:pt-6">
            <h1 className="text-[2rem] font-bold leading-[1.25] tracking-[-0.01em] text-slate-900 sm:text-5xl" style={palt}>
              問題を書く手を、
              <br />
              止めない。
            </h1>
            <p className="mt-4 flex flex-wrap gap-x-3 text-lg font-semibold text-accent sm:text-xl" style={palt} aria-label="書く。確かめる。並べる。出す。">
              {verbs.map((v, i) => (
                <motion.span key={v} aria-hidden initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.09, duration: 0.35, ease: "easeOut" }}>{v}</motion.span>
              ))}
            </p>
            <p className="mt-5 max-w-md leading-relaxed text-slate-600" style={jp}>
              競技クイズの作問から、裏どり・採用・出題順・印刷まで。チームで一つの問題セットを仕上げるための専用エディタです。
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/signup" className="group flex min-h-[44px] items-center gap-1.5 rounded-lg bg-brand-600 px-5 text-sm font-medium text-white hover:bg-brand-700">
                無料で始める
                <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
              </Link>
              <Link href="/login" className="flex min-h-[44px] items-center rounded-lg border border-slate-200 bg-surface px-5 text-sm font-medium text-slate-600 hover:border-brand-300 hover:text-accent">ログイン</Link>
            </div>
            <p className="mt-6 max-w-md text-sm text-slate-500" style={jp}>体験用の画面で、問題と解答を入力して「保存して次へ」を押してみてください。キーボードでは Ctrl／⌘＋Enter でも保存できます。</p>
          </div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: "easeOut" }}>
            <QuickDemo />
          </motion.div>
        </section>

        <section className="border-t border-slate-100 bg-surface">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
            <h2 className={h2} style={palt}>書いた問題が、本番の問題用紙になるまで</h2>
            <p className="mt-3 max-w-xl text-slate-600" style={jp}>作問から本番の出力までを、同じ画面の中でたどれます。</p>
            <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
              {flow.map((f, i) => (
                <li key={f.title} className="relative border-l border-slate-200 pl-5 lg:border-l-0 lg:border-t lg:pl-0 lg:pt-5">
                  <span className="absolute -left-[13px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white lg:-top-3 lg:left-0">{i + 1}</span>
                  <h3 className="font-semibold text-slate-800">{f.title}</h3>
                  <p className="mb-2 text-xs text-slate-400">{f.who}</p>
                  <p className="text-sm leading-relaxed text-slate-600" style={jp}>{f.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-14">
          <div className="lg:order-2">
            <h2 className={h2} style={palt}>画像も、そのまま問題に</h2>
            <p className="mt-4 max-w-md leading-relaxed text-slate-600" style={jp}>
              問題文にも、解答にも、解説にも、画像を付けられます。写真や図をコピーして、貼り付けるだけ。ビジュアルクイズも、文字だけの問題と同じ手順で作れます。
            </p>
            <ul className="mt-5 max-w-md space-y-2 text-sm text-slate-600">
              <li style={jp}>貼り付け・ドラッグ＆ドロップ・ファイル選択のどれでも追加できます。</li>
              <li style={jp}>保存するときに、ちょうどよい大きさへ自動で縮小します。</li>
              <li style={jp}>印刷やPDFにも、画像がそのまま入ります。</li>
            </ul>
          </div>
          <div className="lg:order-1"><VisualSample /></div>
        </section>

        <section className="border-t border-slate-100 bg-surface">
          <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-14">
            <div>
              <h2 className={h2} style={palt}>同じジャンルが続かない並びを、ルールで作る</h2>
              <p className="mt-4 max-w-md leading-relaxed text-slate-600" style={jp}>
                大ジャンル・小ジャンル・作問者の連続を避けるルールを、Roundごとに設定できます。連続の長さは2〜4問から選べます。違反している箇所は並べ替え画面で目立つように示されます。
              </p>
              <p className="mt-4 text-sm text-slate-500" style={jp}>「ルールを考慮してシャッフル」を押すと、並び替えの効果を試せます。</p>
            </div>
            <OrderDemo />
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
          <h2 className={`${h2} mb-8`} style={palt}>こんな場面で</h2>
          <div className="grid gap-x-10 gap-y-7 sm:grid-cols-3">
            {scenes.map((s) => (
              <div key={s.title} className="border-t border-slate-200 pt-4">
                <h3 className="mb-1 font-semibold text-slate-800">{s.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600" style={jp}>{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-slate-100 bg-surface">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
            <h2 className={`${h2} mb-8`} style={palt}>チームで使うために</h2>
            <dl className="grid gap-x-10 gap-y-7 sm:grid-cols-2">
              {extras.map((e) => (
                <div key={e.term} className="border-t border-slate-200 pt-4">
                  <dt className="mb-1 font-semibold text-slate-800">{e.term}</dt>
                  <dd className="text-sm leading-relaxed text-slate-600" style={jp}>{e.desc}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
          <h2 className={`${h2} mb-6`} style={palt}>よくある質問</h2>
          <div className="divide-y divide-slate-200 border-y border-slate-200">
            {faqs.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-slate-800">
                  <span style={jp}>{f.q}</span>
                  <span aria-hidden className="shrink-0 text-slate-400 transition group-open:rotate-45">＋</span>
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-slate-600" style={jp}>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 sm:pb-24">
          <div className="rounded-2xl border border-slate-200 bg-surface p-6 sm:p-10">
            <h2 className={h2} style={palt}>次の問題を、書きはじめよう。</h2>
            <p className="mt-3 max-w-lg text-slate-600" style={jp}>アカウントを作って、問題セットを作成し、メンバーを招待すれば、すぐに作問を始められます。</p>
            <Link href="/signup" className="mt-6 inline-flex min-h-[44px] items-center rounded-lg bg-brand-600 px-6 text-sm font-medium text-white hover:bg-brand-700">無料で始める</Link>
          </div>
        </section>

        <footer className="mx-auto flex max-w-5xl items-center gap-2 px-4 pb-10 text-xs text-slate-400 sm:px-6">
          <Logo size={18} />
          <span>Qraft — クイズ作問エディタ</span>
        </footer>
      </div>
    </MotionConfig>
  );
}
