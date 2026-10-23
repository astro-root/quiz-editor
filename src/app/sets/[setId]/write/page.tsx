"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useSetContext } from "@/lib/SetContext";
import { useQuestionStore } from "@/lib/QuestionsContext";
import { canCreateQuestion } from "@/lib/permissions";
import { MAX_SOURCES, Question } from "@/lib/types";
import { QuestionEditor } from "@/components/QuestionEditor";

const input = "w-full rounded-lg border border-slate-200 bg-surface p-2.5 text-base text-slate-700 placeholder:text-slate-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";
const label = "mb-1 block text-xs text-slate-400";

// 作問モード。入力中の内容はブラウザ内の下書きにだけあり、［保存］するまでDBには何も作らない。
// （以前は画面を開くだけで空の問題ドキュメントが作られ、それが空問題が増える原因だった）
export default function WritePage() {
  const { user } = useAuth();
  const { set, role, tree, gi } = useSetContext();
  const store = useQuestionStore();
  const canCreate = canCreateQuestion(role);
  const draftKey = `qraft:draft:${set.id}`;

  const [body, setBody] = useState("");
  const [answer, setAnswer] = useState("");
  const [explanation, setExplanation] = useState("");
  const [altAnswers, setAltAnswers] = useState("");
  const [source, setSource] = useState("");
  const [genreId, setGenreId] = useState("");
  const [subGenreId, setSubGenreId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedCount, setSavedCount] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // リロードや誤操作で書きかけが消えないよう、ブラウザ内（sessionStorage）にだけ退避する
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (raw) {
        const d = JSON.parse(raw);
        setBody(d.body ?? ""); setAnswer(d.answer ?? ""); setExplanation(d.explanation ?? "");
        setAltAnswers(d.altAnswers ?? ""); setSource(d.source ?? ""); setGenreId(d.genreId ?? ""); setSubGenreId(d.subGenreId ?? "");
      }
    } catch { /* noop */ }
  }, [draftKey]);
  useEffect(() => {
    try { sessionStorage.setItem(draftKey, JSON.stringify({ body, answer, explanation, altAnswers, source, genreId, subGenreId })); } catch { /* noop */ }
  }, [draftKey, body, answer, explanation, altAnswers, source, genreId, subGenreId]);

  const dup = store.findDuplicate(body);
  const empty = !body.trim() && !answer.trim();

  async function handleSave() {
    if (saving) return;
    setError("");
    if (empty) return setError("問題文か答えのどちらかを入力してください");
    setSaving(true);
    try {
      await store.createQuestion({
        body, answer, explanation, genreId, subGenreId,
        altAnswers: altAnswers.split(",").map((s) => s.trim()).filter(Boolean),
        sources: source.trim() ? [source.trim()] : [],
        status: "draft",
      });
      setBody(""); setAnswer(""); setExplanation(""); setAltAnswers(""); setSource(""); // ジャンルは連続作問のため維持
      setSavedCount((n) => n + 1);
      bodyRef.current?.focus();
    } catch (e: any) {
      console.error("問題の作成に失敗しました", e);
      setError(e?.code === "permission-denied" ? "問題を作成する権限がありません" : e?.message || "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  const recent = useMemo(() => {
    const mine = store.live.filter((q) => q.authorUid === user?.uid);
    return mine.slice(-5).reverse();
  }, [store.live, user]);

  if (!canCreate) {
    return <p className="rounded-xl border border-dashed border-slate-200 bg-surface p-6 text-center text-sm text-slate-400">この権限では問題を作成できません。「問題」タブで内容を確認できます。</p>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); handleSave(); } }} className="rounded-2xl border border-slate-100 bg-surface p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
          <span>新しい問題（保存するまで登録されません）</span>
          {savedCount > 0 && <span className="text-ok">今回 {savedCount} 問を保存しました</span>}
        </div>
        <label className={label}>問題文</label>
        <textarea ref={bodyRef} value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="問題文を入力" className={`${input} mb-1 resize-y leading-relaxed`} autoFocus />
        {dup && <p className="mb-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-warn-strong">同じ問題文が既にあります（{set.memberProfiles?.[dup.authorUid]?.displayName || dup.authorName || "作問者不明"}）</p>}
        <p className="mb-2 text-right text-[11px] text-slate-300">{body.length}文字</p>
        <label className={label}>解答</label>
        <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={1} placeholder="解答" className={`${input} mb-3 resize-y font-medium text-accent-strong`} />
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
        <details className="mb-3">
          <summary className="cursor-pointer text-xs text-slate-500">解説・別解・出典を追加（最大{MAX_SOURCES}件はあとで一覧から追加できます）</summary>
          <div className="mt-2 space-y-2">
            <input value={altAnswers} onChange={(e) => setAltAnswers(e.target.value)} placeholder="別解（カンマ区切り）" className={input} />
            <textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={2} placeholder="解説" className={`${input} resize-y`} />
            <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="出典（URLなど）" className={input} />
          </div>
        </details>
        {error && <p role="alert" className="mb-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-danger">{error}</p>}
        <div className="flex items-center gap-3">
          <button onClick={handleSave} disabled={saving || empty} className="flex min-h-[44px] items-center gap-1.5 rounded-lg bg-brand-600 px-6 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40">
            {saving && <Loader2 size={14} className="animate-spin" />}保存して次へ
          </button>
          <span className="hidden text-[11px] text-slate-300 sm:inline">Ctrl/⌘+Enter</span>
          {!empty && <button onClick={() => { if (confirm("入力中の内容を破棄しますか？")) { setBody(""); setAnswer(""); setExplanation(""); setAltAnswers(""); setSource(""); } }} className="ml-auto text-xs text-slate-400 hover:text-slate-600">入力を破棄</button>}
        </div>
      </div>

      {recent.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-medium text-slate-400">最近作成した自分の問題</p>
          <div className="space-y-2">
            {recent.map((q: Question) =>
              editingId === q.id ? (
                <QuestionEditor key={q.id} question={q} onClose={() => setEditingId(null)} />
              ) : (
                <button key={q.id} onClick={() => setEditingId(q.id)} className="block w-full rounded-xl border border-slate-200 bg-surface p-3 text-left text-sm hover:border-brand-300">
                  <p className="line-clamp-2 text-slate-700">{q.body || "（問題文なし）"}</p>
                  <p className="truncate text-accent">{q.answer}</p>
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
