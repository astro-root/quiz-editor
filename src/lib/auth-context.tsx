"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import {
  User,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { normalizeText } from "./search";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  logIn: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
  updateMyProfile: (displayName: string, photoURL: string) => Promise<void>;
  changePassword: (current: string, next: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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

  // 既存ユーザー（この機能の追加前に登録した人）の公開プロフィールを初回ログイン時に補完する
  useEffect(() => {
    if (!user || profileSynced.current === user.uid) return;
    profileSynced.current = user.uid;
    (async () => {
      try {
        const name = user.displayName || user.email?.split("@")[0] || "名無し";
        const snap = await getDoc(doc(db, "publicProfiles", user.uid));
        if (!snap.exists() || snap.data().displayName !== name) {
          await writePublicProfile(user.uid, name, snap.data()?.photoURL ?? user.photoURL ?? "");
        }
      } catch (e) {
        console.error("公開プロフィールの同期に失敗しました", e);
      }
    })();
  }, [user]);

  async function signUp(email: string, password: string, displayName: string) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    await setDoc(doc(db, "users", cred.user.uid), {
      email: cred.user.email,
      displayName,
      createdAt: serverTimestamp(),
    });
    await writePublicProfile(cred.user.uid, displayName, "");
  }

  async function logIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
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

  // パスワード変更は、現在のパスワードで本人確認（再認証）してから行う
  async function changePassword(current: string, next: string) {
    const u = auth.currentUser;
    if (!u || !u.email) throw new Error("not authenticated");
    await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, current));
    await updatePassword(u, next);
  }

  async function sendPasswordReset(email: string) {
    await sendPasswordResetEmail(auth, email.trim());
  }

  return (
    <AuthContext.Provider value={{ user, loading, signUp, logIn, logOut, updateMyProfile, changePassword, sendPasswordReset }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
