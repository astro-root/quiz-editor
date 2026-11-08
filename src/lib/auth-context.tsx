"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import {
  AuthCredential,
  GoogleAuthProvider,
  User,
  linkWithCredential,
  linkWithPopup,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { normalizeText } from "./search";

// Google でログインした結果。「needs-link」は、同じメールアドレスの、パスワードで作られたアカウントがすでにある場合。
export type GoogleSignInResult = { status: "ok" } | { status: "needs-link"; email: string; credential: AuthCredential };

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<GoogleSignInResult>;
  // 以前のパスワードのアカウントに、Google を連結する（移行のための手順。ログアウト中の人向け）
  linkGoogleToPasswordAccount: (email: string, password: string, credential: AuthCredential) => Promise<void>;
  // ログイン中のアカウントに、Google を連結する（移行のための手順。ログイン中の人向け）
  linkGoogle: () => Promise<void>;
  logOut: () => Promise<void>;
  updateMyProfile: (displayName: string, photoURL: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const googleProvider = () => {
  const p = new GoogleAuthProvider();
  p.setCustomParameters({ prompt: "select_account" }); // 複数のGoogleアカウントを持つ人が、選べるようにする
  return p;
};

// 招待のユーザー検索用に、メールアドレスを含まない公開プロフィールだけを別コレクションに置く。
// （users/{uid} はメールを含むため本人しか読めない設計のまま）
async function writePublicProfile(uid: string, displayName: string, photoURL: string) {
  await setDoc(
    doc(db, "publicProfiles", uid),
    {
      displayName,
      displayNameLower: normalizeText(displayName),
      photoURL,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const profileSynced = useRef<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  // ログイン時に、users/{uid} と公開プロフィールを、無ければ作り、名前が違えば合わせる。
  // （Google で初めてログインした人には、どちらもまだ無い。表示名は40文字までのルールがあるので切り詰める）
  useEffect(() => {
    if (!user || profileSynced.current === user.uid) return;
    profileSynced.current = user.uid;
    (async () => {
      try {
        const name = (user.displayName || user.email?.split("@")[0] || "名無し").slice(0, 40);
        const uref = doc(db, "users", user.uid);
        if (!(await getDoc(uref)).exists()) {
          await setDoc(uref, { email: user.email ?? "", displayName: name, createdAt: serverTimestamp() });
        }
        const snap = await getDoc(doc(db, "publicProfiles", user.uid));
        if (!snap.exists() || snap.data().displayName !== name) {
          await writePublicProfile(user.uid, name, snap.data()?.photoURL ?? user.photoURL ?? "");
        }
      } catch (e) {
        console.error("プロフィールの同期に失敗しました", e);
      }
      // メールアドレスでの招待検索用の登録。確認済みのメールだけ。失敗しても、ほかの動作には影響しない。
      try {
        if (user.email && user.emailVerified) {
          const eref = doc(db, "emails", user.email.toLowerCase());
          const cur = await getDoc(eref);
          if (!cur.exists() || cur.data().uid !== user.uid) await setDoc(eref, { uid: user.uid, updatedAt: serverTimestamp() });
        }
      } catch (e) {
        console.error("メールアドレスの検索用登録に失敗しました", e);
      }
    })();
  }, [user]);

  async function signInWithGoogle(): Promise<GoogleSignInResult> {
    try {
      await signInWithPopup(auth, googleProvider());
      return { status: "ok" };
    } catch (e: any) {
      if (e?.code === "auth/account-exists-with-different-credential") {
        const credential = GoogleAuthProvider.credentialFromError(e);
        const email = e?.customData?.email;
        if (credential && typeof email === "string") return { status: "needs-link", email, credential };
      }
      throw e;
    }
  }

  async function linkGoogleToPasswordAccount(email: string, password: string, credential: AuthCredential) {
    const res = await signInWithEmailAndPassword(auth, email, password);
    await linkWithCredential(res.user, credential);
  }

  async function linkGoogle() {
    if (!auth.currentUser) throw new Error("not authenticated");
    await linkWithPopup(auth.currentUser, googleProvider());
    setUser(Object.assign(Object.create(Object.getPrototypeOf(auth.currentUser)), auth.currentUser)); // 連結結果を画面に反映
  }

  async function logOut() {
    profileSynced.current = null;
    await signOut(auth);
  }

  async function updateMyProfile(displayName: string, photoURL: string) {
    if (!auth.currentUser) throw new Error("not authenticated");
    const name = displayName.trim();
    if (!name) throw new Error("表示名を入力してください");
    if (photoURL && !/^https:\/\//.test(photoURL)) throw new Error("アイコンURLは https:// で始めてください");
    await updateProfile(auth.currentUser, { displayName: name, photoURL: photoURL || null });
    await setDoc(doc(db, "users", auth.currentUser.uid), { displayName: name }, { merge: true });
    await writePublicProfile(auth.currentUser.uid, name, photoURL);
    setUser(Object.assign(Object.create(Object.getPrototypeOf(auth.currentUser)), auth.currentUser));
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, linkGoogleToPasswordAccount, linkGoogle, logOut, updateMyProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
