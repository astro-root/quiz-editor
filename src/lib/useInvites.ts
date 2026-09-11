"use client";

import { useEffect, useState } from "react";
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { Invite, Role } from "./types";
import { useAuth } from "./auth-context";

// 招待はCloud Functionsを使わず、
// invites/{メールアドレス} という1ドキュメントを使って実現する。
// - ドキュメントIDにメールアドレスをそのまま使うことで、
//   「自分宛の招待だけを読める」というルールをCloud Functions無しで実装できる。
// - メールアドレス一覧を検索・列挙できるようなクエリは一切行わない。
export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function useMyInvite() {
  const { user } = useAuth();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user?.email) {
        setInvite(null);
        setLoading(false);
        return;
      }
      const ref = doc(db, "invites", normalizeEmail(user.email));
      const snap = await getDoc(ref);
      setInvite(snap.exists() ? (snap.data() as Invite) : null);
      setLoading(false);
    }
    load();
  }, [user]);

  return { invite, loading };
}

export async function inviteMember(
  setId: string,
  setName: string,
  invitedByUid: string,
  email: string,
  role: Role
) {
  const normalized = normalizeEmail(email);
  await setDoc(doc(db, "invites", normalized), {
    setId,
    setName,
    role,
    invitedBy: invitedByUid,
    createdAt: serverTimestamp(),
  });
}

// 招待を承諾する：questionSets.members に自分を追加し、
// 自分宛のinvitesドキュメントを削除する。
export async function acceptInvite(
  setId: string,
  uid: string,
  role: Role,
  email: string
) {
  await updateDoc(doc(db, "questionSets", setId), {
    [`members.${uid}`]: role,
    updatedAt: serverTimestamp(),
  });
  await deleteDoc(doc(db, "invites", normalizeEmail(email)));
}
