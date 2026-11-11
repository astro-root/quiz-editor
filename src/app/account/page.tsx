"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, AtSign, LogOut, Mail, Palette, UserRound } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { PageSkeleton } from "@/components/Skeleton";
import { Avatar } from "@/components/Avatar";
import { ThemeSelector } from "@/components/ThemeSelector";
import { IMAGE_ACCEPT, packAvatar, Packed, toDataUrl } from "@/lib/imageTools";
import { parseAvatarRef, removeAvatar, saveAvatar } from "@/lib/avatars";
import { getMyHandle, HANDLE_MAX, isHandleTaken, normalizeHandle, saveHandle, validateHandle } from "@/lib/handles";

const card = "mb-5 rounded-2xl border border-slate-100 bg-surface p-5 shadow-card";
const inputCls = "w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";
const labelCls = "mb-1 block text-xs text-slate-400";
const primaryBtn = "rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50";

type Msg = { ok: boolean; text: string } | null;
const Note = ({ m }: { m: Msg }) =>
  m ? <p role={m.ok ? "status" : "alert"} className={`mt-3 rounded-lg px-3 py-2 text-sm ${m.ok ? "bg-emerald-50 text-ok" : "bg-rose-50 text-danger"}`}>{m.text}</p> : null;

export default function AccountPage() {
  const { user, loading, logOut, updateMyProfile } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [photo, setPhoto] = useState("");
  const [profMsg, setProfMsg] = useState<Msg>(null);
  const [profBusy, setProfBusy] = useState(false);
  const [pending, setPending] = useState<Packed | null>(null); // 選んだばかりの未保存のアイコン
  const [cleared, setCleared] = useState(false); // アイコンを外す指定
  const [avBusy, setAvBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [handle, setHandle] = useState("");
  const [savedHandle, setSavedHandle] = useState("");
  const [hCheck, setHCheck] = useState<"" | "checking" | "ok" | "taken">("");
  const [hMsg, setHMsg] = useState<Msg>(null);
  const [hBusy, setHBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  // 入力欄の初期値は、ユーザー情報が読み込めたときに一度だけ入れる
  const uid = user?.uid;
  useEffect(() => {
    if (!user) return;
    setName(user.displayName ?? "");
    setPhoto(user.photoURL ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // 設定済みのユーザーIDを読み込む
  useEffect(() => {
    if (!uid) return;
    getMyHandle(uid).then((h) => { setSavedHandle(h); setHandle(h); }).catch((e) => console.error("ユーザーIDの取得に失敗しました", e));
  }, [uid]);

  // 入力のたびに、形式の確認と、使われていないかの確認をする（入力が止まってから）
  const hNorm = normalizeHandle(handle);
  const hErr = hNorm && hNorm !== savedHandle ? validateHandle(hNorm) : null;
  useEffect(() => {
    setHMsg(null);
    if (!uid || !hNorm || hNorm === savedHandle || validateHandle(hNorm)) { setHCheck(""); return; }
    setHCheck("checking");
    let alive = true;
    const t = setTimeout(() => {
      isHandleTaken(hNorm, uid).then((taken) => alive && setHCheck(taken ? "taken" : "ok")).catch(() => alive && setHCheck(""));
    }, 400);
    return () => { alive = false; clearTimeout(t); };
  }, [hNorm, savedHandle, uid]);

  if (loading || !user) return <PageSkeleton />;
  const email = user.email ?? "";
  const viaGoogle = user.providerData.some((p) => p.providerId === "google.com");

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setProfMsg(null);
    setAvBusy(true);
    try {
      setPending(await packAvatar(f));
      setCleared(false);
    } catch (err: any) {
      setProfMsg({ ok: false, text: err?.message || "画像を読み込めませんでした" });
    } finally {
      setAvBusy(false);
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfMsg(null);
    setProfBusy(true);
    try {
      let next = cleared ? "" : photo;
      if (pending) next = await saveAvatar(user!.uid, pending);
      await updateMyProfile(name, next);
      // 外した、または新しい画像に替えたとき、使わなくなった古い画像を消す
      if ((cleared || pending) && parseAvatarRef(photo) && next !== photo && !pending) await removeAvatar(user!.uid);
      setPhoto(next);
      setPending(null);
      setCleared(false);
      setProfMsg({ ok: true, text: "プロフィールを保存しました" });
    } catch (err: any) {
      setProfMsg({ ok: false, text: err?.message || "プロフィールを保存できませんでした" });
    } finally {
      setProfBusy(false);
    }
  }

  async function submitHandle(e: React.FormEvent) {
    e.preventDefault();
    if (!user || hBusy) return;
    setHMsg(null);
    setHBusy(true);
    try {
      await saveHandle(user.uid, savedHandle, hNorm);
      setSavedHandle(hNorm);
      setHandle(hNorm);
      setHCheck("");
      setHMsg({ ok: true, text: "ユーザーIDを保存しました" });
    } catch (err: any) {
      setHMsg({ ok: false, text: err?.message || "ユーザーIDを保存できませんでした" });
    } finally {
      setHBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-slate-50">
      <div className="mx-auto max-w-[96rem] px-4 py-8 sm:px-6 lg:px-10">
        <Link href="/dashboard" className="mb-1 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600">
          <ArrowLeft size={12} /> 一覧へ戻る
        </Link>
        <h1 className="mb-6 text-xl font-semibold text-slate-800">アカウント設定</h1>

        <div className="grid items-start gap-x-5 lg:grid-cols-2 2xl:grid-cols-3">

        <section className={card}>
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-slate-600"><UserRound size={15} />プロフィール</h2>
          <p className="mb-4 text-xs text-slate-400">表示名とアイコンは、招待のユーザー検索や問題の作成者表示に使われます。</p>
          <form onSubmit={saveProfile}>
            <div className="mb-3 flex items-center gap-3">
              {pending ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={toDataUrl(pending.mime, pending.data)} alt="新しいアイコンのプレビュー" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <Avatar name={name || email} photoURL={cleared ? "" : photo} size={48} />
              )}
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => fileRef.current?.click()} disabled={avBusy} className="min-h-[36px] rounded-lg border border-slate-200 px-3 text-xs text-slate-600 hover:border-brand-300 hover:text-accent disabled:opacity-50">{avBusy ? "変換中…" : "画像を選ぶ"}</button>
                {(pending || (photo && !cleared)) && (
                  <button type="button" onClick={() => { setPending(null); setCleared(true); }} className="min-h-[36px] rounded-lg px-3 text-xs text-slate-400 hover:text-danger">画像を外す</button>
                )}
                <input ref={fileRef} type="file" accept={IMAGE_ACCEPT} hidden onChange={onPickAvatar} />
              </div>
            </div>
            <p className="mb-3 text-[11px] text-slate-400">中央を正方形に切り抜いて、小さく保存します。「保存」を押すと反映されます。</p>
            <label className={labelCls} htmlFor="acc-name">表示名（40文字まで）</label>
            <input id="acc-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={40} className={`${inputCls} mb-3`} />
            <button type="submit" disabled={profBusy} className={primaryBtn}>{profBusy ? "保存中…" : "保存"}</button>
          </form>
          <Note m={profMsg} />
        </section>

        <section className={card}>
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-slate-600"><AtSign size={15} />ユーザーID</h2>
          <p className="mb-3 text-xs leading-relaxed text-slate-400">招待は、ユーザーIDの完全一致で探します（表示名やメールアドレスでは探せません）。招待してほしい人に、このIDを伝えてください。英数字・アンダースコア（_）・ピリオド（.）が使え、{3}〜{HANDLE_MAX}文字です。英字は小文字になります。ほかの人と同じIDは使えません。</p>
          <form onSubmit={submitHandle}>
            <label className={labelCls} htmlFor="acc-handle">ユーザーID</label>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-slate-400" aria-hidden>@</span>
              <input id="acc-handle" value={handle} onChange={(e) => setHandle(e.target.value)} maxLength={HANDLE_MAX + 1} autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-describedby="acc-handle-hint" className={inputCls} />
            </div>
            <p id="acc-handle-hint" role="status" className={`mb-3 min-h-[1.25rem] text-xs ${hErr || hCheck === "taken" ? "text-danger" : hCheck === "ok" ? "text-ok" : "text-slate-400"}`}>
              {hErr ?? (hCheck === "checking" ? "確認中…" : hCheck === "taken" ? "このIDは、すでに使われています" : hCheck === "ok" ? "このIDは使えます" : savedHandle && hNorm === savedHandle ? "設定中のIDです" : "")}
            </p>
            <button type="submit" disabled={hBusy || !hNorm || hNorm === savedHandle || !!hErr || hCheck === "taken" || hCheck === "checking"} className={primaryBtn}>{hBusy ? "保存中…" : savedHandle ? "IDを変更" : "IDを設定"}</button>
          </form>
          <Note m={hMsg} />
        </section>

        <section className={card}>
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-slate-600"><Palette size={15} />表示</h2>
          <p className="mb-3 text-xs text-slate-400">この端末のブラウザに保存されます。ほかの端末では、それぞれで設定してください。</p>
          <ThemeSelector />
        </section>

        <section className={card}>
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-slate-600"><Mail size={15} />ログイン情報</h2>
          <p className="mb-1 text-xs text-slate-400">メールアドレス</p>
          <p className="mb-3 break-all text-sm text-slate-700">{email || "（未設定）"}</p>
          <p className="text-xs leading-relaxed text-slate-400">
            {viaGoogle
              ? "Googleアカウントでログインしています。メールアドレスや、ログインの管理は、Googleアカウント側で行います。"
              : "このアカウントは、まだGoogleと連結されていません。一覧の画面に出る案内から、連結してください。"}
          </p>
        </section>

        <section className={card}>
          <button onClick={logOut} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"><LogOut size={14} />ログアウト</button>
        </section>
        </div>
      </div>
    </div>
  );
}
