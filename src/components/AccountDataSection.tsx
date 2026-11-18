"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Download, Loader2, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { checkDeletion, DeletionCheck, deleteMyAccount, exportMyData } from "@/lib/accountData";
import { downloadJson, stamp } from "@/lib/backup";
import { Modal } from "./Modal";

const card = "mb-5 rounded-2xl border border-slate-100 bg-surface p-5 shadow-card";
const CONFIRM_WORD = "削除";

// 自分のデータのダウンロードと、アカウントの削除
export function AccountDataSection() {
  const { user } = useAuth();
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [check, setCheck] = useState<DeletionCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("");
  const [error, setError] = useState("");
  if (!user) return null;

  async function download() {
    setExporting(true); setExportMsg(null);
    try {
      downloadJson(`qraft-my-data-${stamp()}.json`, await exportMyData(user!));
      setExportMsg({ ok: true, text: "ダウンロードしました" });
    } catch (e) {
      console.error(e);
      setExportMsg({ ok: false, text: "ダウンロードできませんでした" });
    } finally {
      setExporting(false);
    }
  }

  async function startDelete() {
    setChecking(true); setError(""); setWord("");
    try { setCheck(await checkDeletion(user!.uid)); setOpen(true); }
    catch (e) { console.error(e); setError("確認できませんでした。時間をおいて、もう一度お試しください"); }
    finally { setChecking(false); }
  }

  async function doDelete() {
    setBusy(true); setError("");
    try {
      await deleteMyAccount(user!, setStep);
      router.replace("/");
    } catch (e: any) {
      console.error(e);
      setError(
        e?.code === "auth/popup-closed-by-user" || e?.code === "auth/cancelled-popup-request" ? "本人確認が完了しませんでした。もう一度お試しください"
        : e?.code === "auth/popup-blocked" ? "ポップアップがブロックされています。許可してから、もう一度お試しください"
        : e?.message || "削除できませんでした。時間をおいて、もう一度お試しください"
      );
    } finally {
      setBusy(false); setStep("");
    }
  }

  const blocked = (check?.ownedSets.length ?? 0) > 0;
  return (
    <>
      <section className={card}>
        <h2 className="mb-1 flex items-center gap-1.5 text-sm font-medium text-slate-600"><Download size={15} />データのダウンロード</h2>
        <p className="mb-3 text-xs leading-relaxed text-slate-400">アカウント情報と、参加している問題セットごとの、自分が作った問題を、JSONファイルで保存します。問題セット全体のバックアップは、各セットの「入出力」から取れます。</p>
        <button onClick={download} disabled={exporting} className="flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-200 bg-surface px-4 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50">
          {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}ダウンロードする
        </button>
        {exportMsg && <p role="status" className={`mt-2 text-xs ${exportMsg.ok ? "text-ok" : "text-danger"}`}>{exportMsg.text}</p>}
      </section>

      <section className="mb-5 rounded-2xl border border-rose-100 bg-surface p-5 shadow-card">
        <h2 className="mb-1 flex items-center gap-1.5 text-sm font-medium text-danger"><Trash2 size={15} />アカウントの削除</h2>
        <p className="mb-3 text-xs leading-relaxed text-slate-400">アカウントとプロフィール（ユーザーID・表示名・アイコン）を削除し、参加している問題セットから抜けます。削除は、取り消せません。</p>
        <button onClick={startDelete} disabled={checking} className="flex min-h-[44px] items-center gap-1.5 rounded-lg border border-rose-200 bg-surface px-4 text-sm text-danger hover:bg-rose-50 disabled:opacity-50">
          {checking && <Loader2 size={14} className="animate-spin" />}アカウントを削除する
        </button>
        {error && !open && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
      </section>

      {open && check && (
        <Modal size="md" label="アカウントの削除" onRequestClose={() => { if (!busy) setOpen(false); }}>
          <div className="p-5 sm:p-6">
            <h2 className="mb-3 text-base font-semibold text-slate-800">アカウントを削除しますか？</h2>
            {blocked ? (
              <>
                <p className="mb-2 text-sm leading-relaxed text-slate-600">あなたがオーナーの問題セットが、{check.ownedSets.length}件あります。オーナーは、問題セットから抜けられないので、先に、これらのセットを削除してください（各セットの「設定」から削除できます）。</p>
                <ul className="mb-4 space-y-1">
                  {check.ownedSets.map((s) => <li key={s.id}><Link href={`/sets/${s.id}/settings`} className="text-sm text-accent underline">{s.name}</Link></li>)}
                </ul>
                <p className="mb-4 text-xs text-slate-400">セットを、残したまま削除したい場合は、お問い合わせからご相談ください。</p>
                <div className="flex justify-end"><button onClick={() => setOpen(false)} className="min-h-[44px] rounded-lg border border-slate-200 bg-surface px-5 text-sm text-slate-600 hover:bg-slate-50">閉じる</button></div>
              </>
            ) : (
              <>
                <ul className="mb-3 list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-600">
                  <li>ユーザーID・表示名・アイコン・ログイン用のアカウントを、削除します。</li>
                  <li>参加している問題セット{check.memberSets.length > 0 ? `（${check.memberSets.length}件）` : ""}から、抜けます。</li>
                  <li>あなたが作った問題は、問題セットに残ります（作成者名は、そのときの表示名のままです）。残したくない問題は、先に、各セットで削除してください。</li>
                  <li>本人確認のため、Googleのログイン画面が開きます。</li>
                </ul>
                <p className="mb-2 text-sm text-slate-600">続けるには、下の欄に「{CONFIRM_WORD}」と入力してください。</p>
                <input value={word} onChange={(e) => setWord(e.target.value)} disabled={busy} aria-label="確認の入力" className="mb-3 w-full rounded-lg border border-slate-200 bg-surface p-2.5 text-base focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100" />
                {error && <p role="alert" className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-danger">{error}</p>}
                {busy && step && <p role="status" className="mb-3 flex items-center gap-2 text-sm text-slate-500"><Loader2 size={14} className="animate-spin" />{step}…</p>}
                <div className="flex flex-wrap justify-end gap-2">
                  <button autoFocus onClick={() => setOpen(false)} disabled={busy} className="min-h-[44px] rounded-lg border border-slate-200 bg-surface px-5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50">キャンセル</button>
                  <button onClick={doDelete} disabled={busy || word.trim() !== CONFIRM_WORD} className="min-h-[44px] rounded-lg bg-rose-600 px-5 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-40">削除する</button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
