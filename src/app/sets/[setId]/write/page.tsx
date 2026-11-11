"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useSetContext } from "@/lib/SetContext";
import { useQuestionStore } from "@/lib/QuestionsContext";
import { allowedStatusOptions, canCreateQuestion, canJudge, proofreadLabel, statusLabel } from "@/lib/permissions";
import { ImageSlot, MAX_SOURCES, ProofreadStatus, QuestionStatus } from "@/lib/types";
import { charCount } from "@/lib/text";
import { QuestionBrowser } from "@/components/QuestionBrowser";
import { ImageField, imageFilesFrom, useImageDraft } from "@/components/ImageField";
import { ListInput, parseList } from "@/components/ListInput";
import { AnswerDupNotice } from "@/components/AnswerDupNotice";
import { Modal } from "@/components/Modal";
import { Fab } from "@/components/Fab";

const input = "w-full rounded-lg border border-slate-200 bg-surface p-2.5 text-base text-slate-700 placeholder:text-slate-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";
const label = "mb-1 block text-xs text-slate-400";
const heading = "mb-2 mt-4 border-t border-slate-100 pt-3 text-xs font-medium text-slate-500";
const proofOptions: ProofreadStatus[] = ["unchecked", "in_review", "approved", "needs_fix", "on_hold"];

interface Form {
  body: string; answer: string; altAnswers: string[]; explanation: string; judgingCriteria: string; memo: string;
  tags: string[]; parallel: boolean; current: boolean; genreId: string; subGenreId: string; sources: string[];
  status: QuestionStatus; roundId: string; assigneeUid: string; proofreadStatus: ProofreadStatus;
}
const emptyForm = (): Form => ({
  body: "", answer: "", altAnswers: [], explanation: "", judgingCriteria: "", memo: "", tags: [], parallel: false, current: false,
  genreId: "", subGenreId: "", sources: Array(MAX_SOURCES).fill(""), status: "draft", roundId: "", assigneeUid: "", proofreadStatus: "unchecked",
});

// 書きかけの復元。古い形式（別解が1つの文字列）でも読める
function restore(raw: string): Form {
  const d = JSON.parse(raw);
  const f = emptyForm();
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : typeof v === "string" ? parseList(v) : []);
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    ...f,
    body: str(d.body), answer: str(d.answer), explanation: str(d.explanation), judgingCriteria: str(d.judgingCriteria), memo: str(d.memo),
    altAnswers: list(d.altAnswers), tags: list(d.tags), parallel: d.parallel === true, current: d.current === true,
    genreId: str(d.genreId), subGenreId: str(d.subGenreId),
    sources: Array.from({ length: MAX_SOURCES }, (_, i) => str(Array.isArray(d.sources) ? d.sources[i] : i === 0 ? d.source : "")),
    status: ["draft", "completed", "adopted", "rejected"].includes(d.status) ? d.status : "draft",
    roundId: str(d.roundId), assigneeUid: str(d.assigneeUid),
    proofreadStatus: proofOptions.includes(d.proofreadStatus) ? d.proofreadStatus : "unchecked",
  };
}

// 作問ページ。自分の問題を、新しいものが上になるように、1問ずつカードで並べる。カードを押すと、編集のポップアップが開く。
// 「＋」を押すと、新しい問題を書くポップアップが開く（画面を開いただけでは、何も始まらない）。
// 入力中の内容は、ポップアップを閉じても残る。［保存］するまでDBには何も作らない。
export default function WritePage() {
  const { user } = useAuth();
  const { set, role, tree, gi, personOf } = useSetContext();
  const store = useQuestionStore();
  const canCreate = canCreateQuestion(role);
  const judge = canJudge(role);
  const statusOptions = allowedStatusOptions(role);
  const draftKey = `qraft:draft:${set.id}`;

  const [open, setOpen] = useState(false);
  const [f, setF] = useState<Form>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedCount, setSavedCount] = useState(0);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const imgs = useImageDraft([]);
  const up = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));

  // リロードや誤操作で書きかけが消えないよう、ブラウザ内（sessionStorage）にだけ退避する
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (raw) setF(restore(raw));
    } catch { /* noop */ }
  }, [draftKey]);
  useEffect(() => {
    try { sessionStorage.setItem(draftKey, JSON.stringify(f)); } catch { /* noop */ }
  }, [draftKey, f]);

  // 同じ答え（別解を含む）の問題がないか。保存の最中は、いま作った問題自身にぶつかるので調べない
  const dups = saving ? [] : store.findAnswerDuplicates([f.answer, ...f.altAnswers]);
  const empty = !f.body.trim() && !f.answer.trim();
  const hasDraft = !empty || !!(f.explanation.trim() || f.judgingCriteria.trim() || f.memo.trim() || f.altAnswers.length || f.tags.length || f.sources.some((x) => x.trim())) || imgs.total > 0;

  function pasteImg(field: ImageSlot, e: React.ClipboardEvent) {
    const fs = imageFilesFrom(e);
    if (fs.length) {
      e.preventDefault();
      imgs.addFiles(field, fs);
    }
  }

  // 保存のあと・破棄のときは、ジャンルなども含めて、すべて最初の状態に戻す
  function clearDraft() {
    setF(emptyForm());
    imgs.reset();
  }

  async function handleSave(closeAfter: boolean) {
    if (saving || imgs.busy) return;
    setError("");
    if (empty) return setError("問題文か答えのどちらかを入力してください");
    setSaving(true);
    try {
      await store.createQuestion({
        body: f.body, answer: f.answer, explanation: f.explanation, judgingCriteria: f.judgingCriteria, memo: f.memo,
        altAnswers: f.altAnswers, tags: f.tags, parallel: f.parallel, current: f.current,
        genreId: f.genreId, subGenreId: f.subGenreId,
        sources: f.sources.map((x) => x.trim()).filter(Boolean),
        status: f.status,
        ...(judge ? { roundId: f.roundId, assigneeUid: f.assigneeUid, proofreadStatus: f.proofreadStatus } : {}),
      }, imgs.added);
      clearDraft();
      setSavedCount((n) => n + 1);
      if (closeAfter) setOpen(false);
      else bodyRef.current?.focus();
    } catch (e: any) {
      console.error("問題の作成に失敗しました", e);
      setError(e?.code === "permission-denied" ? "問題を作成する権限がありません" : e?.message || "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  // 新しく作った問題が、上に来る
  const mine = useMemo(
    () => store.live.filter((q) => q.authorUid === user?.uid).sort((a, b) => b.order - a.order || b.createdAt - a.createdAt),
    [store.live, user],
  );
  const quota = user ? set.quotas?.[user.uid] : undefined;

  if (!canCreate) {
    return <p className="rounded-xl border border-dashed border-slate-200 bg-surface p-6 text-center text-sm text-slate-400">この権限では問題を作成できません。「問題」タブで内容を確認できます。</p>;
  }

  const openBtn = "flex min-h-[44px] items-center gap-1.5 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700";
  const members = Object.keys(set.members);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-800">作問</h2>
          <p className="text-xs text-slate-400">「＋」から新しい問題を書けます。カードを押すと、編集できます。新しい問題が上に並びます。</p>
        </div>
        <button onClick={() => setOpen(true)} className={`${openBtn} hidden sm:flex`}><Plus size={16} />新しい問題</button>
      </div>

      {quota !== undefined && quota > 0 && (
        <div className="mb-4 rounded-xl border border-slate-100 bg-surface px-4 py-3">
          <p className="mb-1.5 flex items-baseline justify-between text-sm text-slate-600">
            <span>あなたのノルマ</span>
            <span className="tabular-nums"><b className="text-base text-slate-800">{mine.length}</b> / {quota}問{mine.length >= quota ? "　達成" : `　あと${quota - mine.length}問`}</span>
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={quota} aria-valuenow={Math.min(mine.length, quota)} aria-label="ノルマの進み具合">
            <div className="h-full rounded-full bg-brand-500 transition-[width] duration-500" style={{ width: `${Math.min(100, (mine.length / quota) * 100)}%` }} />
          </div>
        </div>
      )}

      {!open && hasDraft && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-warn-strong">
          <span>書きかけの問題があります{imgs.total > 0 && `（画像 ${imgs.total} 枚）`}。</span>
          <button onClick={() => setOpen(true)} className="font-medium underline">続きを書く</button>
        </div>
      )}

      {mine.length > 0 ? (
        <QuestionBrowser base={mine} storageKey={`qraft:f:${set.id}:write`} showAuthor={false} />
      ) : (
        !hasDraft && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-surface px-6 py-12 text-center">
            <p className="mb-4 text-sm text-slate-400">まだ、あなたの問題がありません。</p>
            <button onClick={() => setOpen(true)} className={`${openBtn} mx-auto`}><Plus size={16} />最初の問題を書く</button>
          </div>
        )
      )}

      {open && (
        <Modal onRequestClose={() => setOpen(false)} label="新しい問題">
          <div className="p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-accent">新しい問題</span>
              <span className="flex items-center gap-2">
                {savedCount > 0 && <span className="text-xs text-ok" role="status">今回 {savedCount} 問を保存しました</span>}
                <button type="button" onClick={() => setOpen(false)} aria-label="閉じる" className="-mr-1 flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
              </span>
            </div>

            <label className={label}>問題文</label>
            <textarea ref={bodyRef} onPaste={(e) => pasteImg("body", e)} value={f.body} onChange={(e) => up("body", e.target.value)} rows={3} placeholder="問題文を入力" className={`${input} mb-1 resize-y leading-relaxed`} autoFocus />
            <p className="mb-2 text-right text-xs tabular-nums text-slate-500" title="前後の空白を除いた文字数">{charCount(f.body)}文字</p>
            <ImageField field="body" draft={imgs} loaded={{}} />

            <label className={label}>解答</label>
            <textarea onPaste={(e) => pasteImg("answer", e)} value={f.answer} onChange={(e) => up("answer", e.target.value)} rows={1} placeholder="解答" className={`${input} mb-2 resize-y font-medium text-accent-strong`} />
            <ImageField field="answer" draft={imgs} loaded={{}} />
            <label className={label}>別解・表記揺れ（「,」「、」か改行で区切る）</label>
            <ListInput value={f.altAnswers} onChange={(v) => up("altAnswers", v)} className={`${input} mb-2`} ariaLabel="別解" />
            <AnswerDupNotice dups={dups} personName={(u, n) => personOf(u, n).name} />

            <p className={heading}>補足</p>
            <label className={label}>解説</label>
            <textarea onPaste={(e) => pasteImg("explanation", e)} value={f.explanation} onChange={(e) => up("explanation", e.target.value)} rows={3} className={`${input} mb-2 resize-y leading-relaxed`} />
            <ImageField field="explanation" draft={imgs} loaded={{}} />
            <label className={label}>正誤判定基準</label>
            <textarea value={f.judgingCriteria} onChange={(e) => up("judgingCriteria", e.target.value)} rows={4} className={`${input} mb-3 resize-y leading-relaxed`} />
            <label className={label}>備考</label>
            <textarea value={f.memo} onChange={(e) => up("memo", e.target.value)} rows={4} className={`${input} resize-y leading-relaxed`} />

            <p className={heading}>分類</p>
            <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={label}>大ジャンル</label>
                <select value={f.genreId} onChange={(e) => setF((p) => ({ ...p, genreId: e.target.value, subGenreId: "" }))} className={input}>
                  <option value="">未設定</option>
                  {tree.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>小ジャンル</label>
                <select value={f.subGenreId} disabled={!f.genreId} onChange={(e) => up("subGenreId", e.target.value)} className={input}>
                  <option value="">未設定</option>
                  {gi.subsOf(f.genreId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <label className={label}>タグ（「,」「、」か改行で区切る）</label>
            <ListInput value={f.tags} onChange={(v) => up("tags", v)} className={`${input} mb-2`} ariaLabel="タグ" />
            <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1">
              <label className="flex min-h-[32px] items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={f.parallel} onChange={(e) => up("parallel", e.target.checked)} className="h-4 w-4" />パラレル</label>
              <label className="flex min-h-[32px] items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={f.current} onChange={(e) => up("current", e.target.checked)} className="h-4 w-4" />時事</label>
            </div>

            <p className={heading}>出典（最大{MAX_SOURCES}件）</p>
            <div className="mb-3 space-y-1.5">
              {f.sources.map((src, i) => (
                <input key={i} value={src} onChange={(e) => setF((p) => ({ ...p, sources: p.sources.map((x, j) => (j === i ? e.target.value : x)) }))} placeholder={`出典${i + 1}（URLなど）`} aria-label={`出典${i + 1}`} className={input} />
              ))}
            </div>

            <p className={heading}>進行管理{!judge && "（Round・裏どり担当・裏どり状態は、問題統括と管理者が設定できます）"}</p>
            <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={label}>{judge ? "状態（採用・却下は、原則「裏どり」から）" : "作問状況"}</label>
                <select value={f.status} onChange={(e) => up("status", e.target.value as QuestionStatus)} className={input}>
                  {statusOptions.map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Round</label>
                <select disabled={!judge} value={f.roundId} onChange={(e) => up("roundId", e.target.value)} className={input}>
                  <option value="">未指定</option>
                  {set.rounds.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>裏どり担当</label>
                <select disabled={!judge} value={f.assigneeUid} onChange={(e) => up("assigneeUid", e.target.value)} className={input}>
                  <option value="">未割り当て</option>
                  {members.map((m) => <option key={m} value={m}>{personOf(m).name}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>裏どり状態</label>
                <select disabled={!judge} value={f.proofreadStatus} onChange={(e) => up("proofreadStatus", e.target.value as ProofreadStatus)} className={input}>
                  {proofOptions.map((s) => <option key={s} value={s}>{proofreadLabel[s]}</option>)}
                </select>
              </div>
            </div>

            {imgs.error && <p role="alert" className="mb-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-danger">{imgs.error}</p>}
            {error && <p role="alert" className="mb-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-danger">{error}</p>}
            <div className="sticky bottom-0 -mx-4 -mb-4 mt-2 flex flex-wrap items-center gap-2 border-t border-slate-100 bg-surface px-4 py-3 sm:-mx-5 sm:-mb-5 sm:px-5">
              <button onClick={() => handleSave(false)} disabled={saving || empty} className="flex min-h-[44px] items-center gap-1.5 rounded-lg bg-brand-600 px-5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40">
                {saving && <Loader2 size={14} className="animate-spin" />}保存して次へ
              </button>
              <button onClick={() => handleSave(true)} disabled={saving || empty} className="min-h-[44px] rounded-lg border border-slate-200 px-4 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40">保存して閉じる</button>
              {hasDraft && <button onClick={() => { if (confirm("入力中の内容を破棄しますか？")) clearDraft(); }} className="ml-auto text-xs text-slate-400 hover:text-slate-600">入力を破棄</button>}
            </div>
          </div>
        </Modal>
      )}

      {!open && <Fab onClick={() => setOpen(true)} label="新しい問題を書く" />}
    </div>
  );
}
