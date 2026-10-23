"use client";

import { useMemo, useRef, useState } from "react";
import { Download, FileDown, FileUp, Loader2 } from "lucide-react";
import { useSetContext } from "@/lib/SetContext";
import { useQuestionStore } from "@/lib/QuestionsContext";
import { canCreateQuestion, canJudge } from "@/lib/permissions";
import { downloadQuestions, downloadTemplate, ExportCtx, ImportResult, parseImportFile } from "@/lib/io";
import { normalizeText } from "@/lib/search";
import { Question } from "@/lib/types";

const card = "mb-5 rounded-2xl border border-slate-100 bg-surface p-5 shadow-card";
const btn = "flex items-center gap-1.5 rounded-lg border border-slate-200 bg-surface px-3 py-1.5 text-sm text-slate-600 hover:border-brand-300 hover:text-accent disabled:opacity-40";

export default function IoPage() {
  const { set, role, tree, gi, personOf } = useSetContext();
  const store = useQuestionStore();
  const [scope, setScope] = useState("all"); // all | adopted | round:<id> | none
  const [onlyProofed, setOnlyProofed] = useState(false);

  const ctx: ExportCtx = useMemo(
    () => ({ set, majorName: gi.majorName, subName: gi.subName, personName: (uid, fb) => personOf(uid, fb).name }),
    [set, gi, personOf]
  );

  const exportList = useMemo(() => {
    let l: Question[] = store.live;
    if (scope === "adopted") l = l.filter((q) => q.status === "adopted");
    else if (scope.startsWith("round:")) l = l.filter((q) => q.status === "adopted" && q.roundId === scope.slice(6));
    if (onlyProofed) l = l.filter((q) => q.proofreadStatus === "approved");
    // 採用問題は出題順、それ以外は作成順
    return scope === "all" ? l : [...l].sort((a, b) => (a.playOrder ?? Infinity) - (b.playOrder ?? Infinity) || a.order - b.order);
  }, [store.live, scope, onlyProofed]);

  const label = scope.startsWith("round:") ? set.rounds.find((r) => r.id === scope.slice(6))?.name ?? "round" : scope === "adopted" ? "採用問題" : "全問題";

  // ---- インポート ----
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [skipDup, setSkipDup] = useState(true);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const importing = progress !== null;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg(null);
    setResult(null);
    setParsing(true);
    try {
      const existing = new Set(store.live.map((q) => normalizeText(q.body)));
      setResult(await parseImportFile(file, { tree, rounds: set.rounds, existingBodies: existing, canJudge: canJudge(role) }));
    } catch (err) {
      console.error(err);
      setMsg({ ok: false, text: "ファイルの解析に失敗しました" });
    } finally {
      setParsing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const importable = useMemo(
    () => (result?.rows ?? []).filter((r) => r.input && !(skipDup && r.duplicate)),
    [result, skipDup]
  );
  const errorRows = (result?.rows ?? []).filter((r) => r.errors.length);
  const warnRows = (result?.rows ?? []).filter((r) => !r.errors.length && r.warnings.length);

  async function runImport() {
    if (!importable.length || importing) return;
    setMsg(null);
    setProgress({ done: 0, total: importable.length });
    try {
      await store.importQuestions(importable.map((r) => r.input!), (done) => setProgress({ done, total: importable.length }));
      setMsg({ ok: true, text: `${importable.length}問を取り込みました` });
      setResult(null);
    } catch (e: any) {
      console.error("インポートに失敗しました", e);
      setMsg({ ok: false, text: e?.code === "permission-denied" ? "問題を作成する権限がありません" : "インポート中にエラーが発生しました。途中までの分は登録済みの可能性があります。一覧で確認してください（再実行すると重複警告が出ます）" });
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <section className={card}>
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-slate-600"><FileDown size={15} />エクスポート</h2>
        <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
          <select value={scope} onChange={(e) => setScope(e.target.value)} className="rounded-lg border border-slate-200 bg-surface p-2 text-sm">
            <option value="all">全問題（作成順）</option>
            <option value="adopted">採用問題すべて（出題順）</option>
            {set.rounds.map((r) => <option key={r.id} value={`round:${r.id}`}>{r.name} の採用問題（出題順）</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-slate-600"><input type="checkbox" checked={onlyProofed} onChange={(e) => setOnlyProofed(e.target.checked)} />裏どり確認済みのみ</label>
        </div>
        <p className="mb-3 text-xs text-slate-400">{exportList.length}問を出力します。列：問題番号／問題文／正解／解説／別解／大ジャンル／小ジャンル／Round／出典／作成者／裏どり担当／出題順／採用状態／裏どり状態</p>
        <div className="flex gap-2">
          <button disabled={!exportList.length} onClick={() => downloadQuestions(exportList, ctx, "xlsx", label)} className={btn}><Download size={14} />Excel (.xlsx)</button>
          <button disabled={!exportList.length} onClick={() => downloadQuestions(exportList, ctx, "csv", label)} className={btn}><Download size={14} />CSV</button>
        </div>
      </section>

      <section className={card}>
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-slate-600"><FileUp size={15} />インポート（Excel / CSV）</h2>
        {!canCreateQuestion(role) ? (
          <p className="text-sm text-slate-400">この権限では問題をインポートできません。</p>
        ) : (
          <>
            <p className="mb-3 text-xs text-slate-400">1行目を見出しにしてください。必須：問題文・正解。任意：解説／別解／大ジャンル／小ジャンル／出典／Round／採用状態。別解・出典は「|」区切りで複数指定できます。取り込み前に内容を検証し、問題のある行は取り込まれません。</p>
            <div className="mb-3 flex gap-2">
              <button onClick={() => fileRef.current?.click()} disabled={parsing || importing} className={btn}>{parsing ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}ファイルを選択</button>
              <button onClick={downloadTemplate} className={btn}>テンプレートをダウンロード</button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={onFile} className="hidden" />
            </div>

            {result?.fatal && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-danger">{result.fatal}</p>}
            {result && !result.fatal && (
              <div className="text-sm">
                {result.unknownColumns.length > 0 && <p className="mb-2 text-xs text-warn">認識できない列は無視します：{result.unknownColumns.join("、")}</p>}
                <p className="mb-2 text-slate-600">
                  全{result.rows.length}行：取り込み可能 <b className="text-ok">{importable.length}</b> ／ エラー <b className="text-danger">{errorRows.length}</b> ／ 重複 <b className="text-warn">{result.rows.filter((r) => r.duplicate).length}</b>
                </p>
                <label className="mb-3 flex items-center gap-1.5 text-xs text-slate-600"><input type="checkbox" checked={skipDup} onChange={(e) => setSkipDup(e.target.checked)} />重複している問題は取り込まない</label>

                {errorRows.length > 0 && (
                  <div className="mb-3 max-h-56 overflow-y-auto rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-danger">
                    <p className="mb-1 font-medium">エラー（これらの行は取り込まれません）</p>
                    {errorRows.slice(0, 200).map((r) => <p key={r.rowNumber}>{r.rowNumber}行目：{r.errors.join(" / ")}</p>)}
                    {errorRows.length > 200 && <p>…ほか{errorRows.length - 200}行</p>}
                  </div>
                )}
                {warnRows.length > 0 && (
                  <div className="mb-3 max-h-40 overflow-y-auto rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-warn-strong">
                    <p className="mb-1 font-medium">注意</p>
                    {warnRows.slice(0, 100).map((r) => <p key={r.rowNumber}>{r.rowNumber}行目：{r.warnings.join(" / ")}</p>)}
                    {warnRows.length > 100 && <p>…ほか{warnRows.length - 100}行</p>}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button onClick={runImport} disabled={importing || importable.length === 0} className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40">
                    {importing && <Loader2 size={14} className="animate-spin" />}{importable.length}問を取り込む
                  </button>
                  <button onClick={() => setResult(null)} disabled={importing} className="text-xs text-slate-400 hover:text-slate-600">キャンセル</button>
                  {progress && <span className="text-xs text-slate-500">{progress.done} / {progress.total}</span>}
                </div>
              </div>
            )}
            {msg && <p role={msg.ok ? "status" : "alert"} className={`mt-3 rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-ok" : "bg-rose-50 text-danger"}`}>{msg.text}</p>}
          </>
        )}
      </section>
    </div>
  );
}
