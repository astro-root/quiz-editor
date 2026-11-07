"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LogOut, Mail, Palette, UserRound } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Avatar } from "@/components/Avatar";
import { ThemeSelector } from "@/components/ThemeSelector";
import { IMAGE_ACCEPT, packAvatar, Packed, toDataUrl } from "@/lib/imageTools";
import { parseAvatarRef, removeAvatar, saveAvatar } from "@/lib/avatars";

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

  if (loading || !user) return null;
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

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Link href="/dashboard" className="mb-1 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600">
          <ArrowLeft size={12} /> 一覧へ戻る
        </Link>
        <h1 className="mb-6 text-xl font-semibold text-slate-800">アカウント設定</h1>

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
  );
}
