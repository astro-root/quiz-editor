"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useSetContext } from "@/lib/SetContext";
import { useQuestionStore } from "@/lib/QuestionsContext";
import { canCreateQuestion } from "@/lib/permissions";
import { ImageSlot, MAX_SOURCES } from "@/lib/types";
import { charCount } from "@/lib/text";
import { QuestionBrowser } from "@/components/QuestionBrowser";
import { ImageField, imageFilesFrom, useImageDraft } from "@/components/ImageField";
import { Modal } from "@/components/Modal";
import { Fab } from "@/components/Fab";

const input = "w-full rounded-lg border border-slate-200 bg-surface p-2.5 text-base text-slate-700 placeholder:text-slate-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";
const label = "mb-1 block text-xs text-slate-400";

// 作問ページ。自分の問題を、1問ずつカードで並べる。カードを押すと、編集のポップアップが開く。
// 「＋」を押すと、新しい問題を書くポップアップが開く（画面を開いただけでは、何も始まらない）。
// 入力中の内容は、ポップアップを閉じても残る。［保存］するまでDBには何も作らない。
export default function WritePage() {
  const { user } = useAuth();
  const { set, role, tree, gi } = useSetContext();
  const store = useQuestionStore();
  const canCreate = canCreateQuestion(role);
  const draftKey = `qraft:draft:${set.id}`;

  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [answer, setAnswer] = useState("");
  const [explanation, setExplanation] = useState("");
  const [altAnswers, setAltAnswers] = useState("");
  const [sources, setSources] = useState<string[]>(() => Array(MAX_SOURCES).fill(""));
  const [genreId, setGenreId] = useState("");
  const [subGenreId, setSubGenreId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedCount, setSavedCount] = useState(0);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const imgs = useImageDraft([]);

  // リロードや誤操作で書きかけが消えないよう、ブラウザ内（sessionStorage）にだけ退避する
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (raw) {
        const d = JSON.parse(raw);
        setBody(d.body ?? ""); setAnswer(d.answer ?? ""); setExplanation(d.explanation ?? "");
        setAltAnswers(d.altAnswers ?? ""); setSources(Array.from({ length: MAX_SOURCES }, (_, i) => (Array.isArray(d.sources) ? d.sources[i] : i === 0 ? d.source : "") ?? "")); setGenreId(d.genreId ?? ""); setSubGenreId(d.subGenreId ?? "");
      }
    } catch { /* noop */ }
  }, [draftKey]);
  useEffect(() => {
    try { sessionStorage.setItem(draftKey, JSON.stringify({ body, answer, explanation, altAnswers, sources, genreId, subGenreId })); } catch { /* noop */ }
  }, [draftKey, body, answer, explanation, altAnswers, sources, genreId, subGenreId]);

  const dup = store.findDuplicate(body);
  const empty = !body.trim() && !answer.trim();
  const hasDraft = !empty || !!(explanation.trim() || altAnswers.trim() || sources.some((x) => x.trim())) || imgs.total > 0;

  function pasteImg(field: ImageSlot, e: React.ClipboardEvent) {
    const fs = imageFilesFrom(e);
    if (fs.length) {
      e.preventDefault();
      imgs.addFiles(field, fs);
    }
  }

  function clearDraft() {
    setBody(""); setAnswer(""); setExplanation(""); setAltAnswers(""); setSources(Array(MAX_SOURCES).fill(""));
    imgs.reset();
  }

  async function handleSave(closeAfter: boolean) {
    if (saving || imgs.busy) return;
    setError("");
    if (empty) return setError("問題文か答えのどちらかを入力してください");
    setSaving(true);
    try {
      await store.createQuestion({
        body, answer, explanation, genreId, subGenreId, // ジャンルは連続作問のため、保存後も維持する
        altAnswers: altAnswers.split(",").map((s) => s.trim()).filter(Boolean),
        sources: sources.map((x) => x.trim()).filter(Boolean),
        status: "draft",
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

  const mine = useMemo(() => store.live.filter((q) => q.authorUid === user?.uid), [store.live, user]);

  if (!canCreate) {
    return <p className="rounded-xl border border-dashed border-slate-200 bg-surface p-6 text-center text-sm text-slate-400">この権限では問題を作成できません。「問題」タブで内容を確認できます。</p>;
  }

  const openBtn = "flex min-h-[44px] items-center gap-1.5 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700";

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-800">作問</h2>
          <p className="text-xs text-slate-400">「＋」から新しい問題を書けます。カードを押すと、編集できます。</p>
        </div>
        <button onClick={() => setOpen(true)} className={`${openBtn} hidden sm:flex`}><Plus size={16} />新しい問題</button>
      </div>

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
        <Modal
          onRequestClose={() => setOpen(false)}
          label="新しい問題"
          onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); handleSave(false); } }}
        >
          <div className="p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-accent">新しい問題</span>
              <span className="flex items-center gap-2">
                {savedCount > 0 && <span className="text-xs text-ok" role="status">今回 {savedCount} 問を保存しました</span>}
                <button type="button" onClick={() => setOpen(false)} aria-label="閉じる" className="-mr-1 flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
              </span>
            </div>
            <label className={label}>問題文</label>
            <textarea ref={bodyRef} onPaste={(e) => pasteImg("body", e)} value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="問題文を入力" className={`${input} mb-1 resize-y leading-relaxed`} autoFocus />
            {dup && <p className="mb-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-warn-strong">同じ問題文が既にあります（{set.memberProfiles?.[dup.authorUid]?.displayName || dup.authorName || "作問者不明"}）</p>}
            <p className="mb-2 text-right text-xs tabular-nums text-slate-500" title="前後の空白を除いた文字数">{charCount(body)}文字</p>
            <ImageField field="body" draft={imgs} loaded={{}} />
            <label className={label}>解答</label>
            <textarea onPaste={(e) => pasteImg("answer", e)} value={answer} onChange={(e) => setAnswer(e.target.value)} rows={1} placeholder="解答" className={`${input} mb-3 resize-y font-medium text-accent-strong`} />
            <ImageField field="answer" draft={imgs} loaded={{}} />
            <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={label}>大ジャンル</label>
                <select value={genreId} onChange={(e) => { setGenreId(e.target.value); setSubGenreId(""); }} className={input}>
                  <option value="">未設定</option>
                  {tree.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>小ジャンル</label>
                <select value={subGenreId} disabled={!genreId} onChange={(e) => setSubGenreId(e.target.value)} className={input}>
                  <option value="">未設定</option>
                  {gi.subsOf(genreId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <label className={label}>出典（最大{MAX_SOURCES}件）</label>
            <div className="mb-3 space-y-1.5">
              {sources.map((src, i) => (
                <input key={i} value={src} onChange={(e) => setSources((a) => a.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`出典${i + 1}（URLなど）`} aria-label={`出典${i + 1}`} className={input} />
              ))}
            </div>
            <details className="mb-3">
              <summary className="cursor-pointer text-xs text-slate-500">解説・別解を追加</summary>
              <div className="mt-2 space-y-2">
                <input value={altAnswers} onChange={(e) => setAltAnswers(e.target.value)} placeholder="別解（カンマ区切り）" className={input} />
                <textarea onPaste={(e) => pasteImg("explanation", e)} value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={2} placeholder="解説" className={`${input} resize-y`} />
                <ImageField field="explanation" draft={imgs} loaded={{}} />
              </div>
            </details>
            {imgs.error && <p role="alert" className="mb-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-danger">{imgs.error}</p>}
            {error && <p role="alert" className="mb-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-danger">{error}</p>}
            <div className="sticky bottom-0 -mx-4 -mb-4 mt-2 flex flex-wrap items-center gap-2 border-t border-slate-100 bg-surface px-4 py-3 sm:-mx-5 sm:-mb-5 sm:px-5">
              <button onClick={() => handleSave(false)} disabled={saving || empty} className="flex min-h-[44px] items-center gap-1.5 rounded-lg bg-brand-600 px-5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40">
                {saving && <Loader2 size={14} className="animate-spin" />}保存して次へ
              </button>
              <button onClick={() => handleSave(true)} disabled={saving || empty} className="min-h-[44px] rounded-lg border border-slate-200 px-4 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40">保存して閉じる</button>
              <span className="hidden text-[11px] text-slate-300 sm:inline">Ctrl/⌘+Enterで保存して次へ</span>
              {hasDraft && <button onClick={() => { if (confirm("入力中の内容を破棄しますか？")) clearDraft(); }} className="ml-auto text-xs text-slate-400 hover:text-slate-600">入力を破棄</button>}
            </div>
          </div>
        </Modal>
      )}

      {!open && <Fab onClick={() => setOpen(true)} label="新しい問題を書く" />}
    </div>
  );
}
