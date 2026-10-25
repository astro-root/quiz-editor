"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, LogOut, Mail, Palette, UserRound } from "lucide-react";
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

function passwordError(code: string | undefined): string {
  switch (code) {
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "現在のパスワードが違います";
    case "auth/weak-password":
      return "新しいパスワードが弱すぎます。もう少し長くしてください";
    case "auth/too-many-requests":
      return "短時間に試行しすぎました。しばらくしてからお試しください";
    case "auth/requires-recent-login":
      return "セキュリティのため、一度ログアウトして入り直してから再度お試しください";
    default:
      return "パスワードを変更できませんでした";
  }
}

export default function AccountPage() {
  const { user, loading, logOut, updateMyProfile, changePassword, sendPasswordReset } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [photo, setPhoto] = useState("");
  const [profMsg, setProfMsg] = useState<Msg>(null);
  const [profBusy, setProfBusy] = useState(false);
  const [pending, setPending] = useState<Packed | null>(null); // 選んだばかりの未保存のアイコン
  const [cleared, setCleared] = useState(false); // アイコンを外す指定
  const [avBusy, setAvBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [pwMsg, setPwMsg] = useState<Msg>(null);
  const [pwBusy, setPwBusy] = useState(false);
  const [resetMsg, setResetMsg] = useState<Msg>(null);

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
  const hasPassword = user.providerData.some((p) => p.providerId === "password");

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

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (next.length < 8) return setPwMsg({ ok: false, text: "新しいパスワードは8文字以上にしてください" });
    if (next !== again) return setPwMsg({ ok: false, text: "新しいパスワードが一致しません" });
    if (next === cur) return setPwMsg({ ok: false, text: "現在と同じパスワードは設定できません" });
    setPwBusy(true);
    try {
      await changePassword(cur, next);
      setCur(""); setNext(""); setAgain("");
      setPwMsg({ ok: true, text: "パスワードを変更しました" });
    } catch (err: any) {
      console.error("パスワード変更に失敗しました", err?.code);
      setPwMsg({ ok: false, text: passwordError(err?.code) });
    } finally {
      setPwBusy(false);
    }
  }

  async function sendReset() {
    setResetMsg(null);
    try {
      await sendPasswordReset(email);
      setResetMsg({ ok: true, text: `${email} に再設定の案内を送信しました` });
    } catch (err: any) {
      setResetMsg({ ok: false, text: err?.code === "auth/too-many-requests" ? "短時間に試行しすぎました。しばらくしてからお試しください" : "送信できませんでした" });
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
          <p className="mb-4 break-all text-sm text-slate-700">{email || "（未設定）"}</p>

          {hasPassword ? (
            <>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-500"><KeyRound size={13} />パスワードの変更</h3>
              <form onSubmit={savePassword}>
                <input type="password" value={cur} onChange={(e) => setCur(e.target.value)} placeholder="現在のパスワード" autoComplete="current-password" required aria-label="現在のパスワード" className={`${inputCls} mb-2`} />
                <input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="新しいパスワード（8文字以上）" autoComplete="new-password" required minLength={8} aria-label="新しいパスワード" className={`${inputCls} mb-2`} />
                <input type="password" value={again} onChange={(e) => setAgain(e.target.value)} placeholder="新しいパスワード（確認）" autoComplete="new-password" required aria-label="新しいパスワード（確認）" className={`${inputCls} mb-3`} />
                <button type="submit" disabled={pwBusy} className={primaryBtn}>{pwBusy ? "変更中…" : "パスワードを変更"}</button>
              </form>
              <Note m={pwMsg} />
              <p className="mt-4 text-xs text-slate-400">
                現在のパスワードを忘れた場合：
                <button type="button" onClick={sendReset} className="ml-1 text-accent underline">登録メールに再設定の案内を送る</button>
              </p>
              <Note m={resetMsg} />
            </>
          ) : (
            <p className="text-xs text-slate-400">このアカウントはパスワードでのログインではないため、ここでは変更できません。</p>
          )}
        </section>

        <section className={card}>
          <button onClick={logOut} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"><LogOut size={14} />ログアウト</button>
        </section>
      </div>
    </div>
  );
}
