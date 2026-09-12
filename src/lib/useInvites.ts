"use client";

import { useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { Invite, PendingInvite, Role } from "./types";
import { useAuth } from "./auth-context";

// 招待はCloud Functionsを使わず、2種類のドキュメントで実現する。
// 1. invites/{メールアドレス}
//    招待された本人だけが読める（ログイン時に自分宛の招待を確認するため）。
// 2. questionSets/{setId}/pendingInvites/{メールアドレス}
//    オーナーだけが読める（自分のセットの招待中一覧を確認するため）。
// メールアドレス一覧を検索・列挙できるクエリは一切行わない。
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

// オーナーが自分のセットの招待中一覧をリアルタイムに見るためのフック。
export function usePendingInvites(setId: string, isOwner: boolean) {
  const [pending, setPending] = useState<PendingInvite[]>([]);

  useEffect(() => {
    if (!setId || !isOwner) {
      setPending([]);
      return;
    }
    const unsub = onSnapshot(
      collection(db, "questionSets", setId, "pendingInvites"),
      (snap) => {
        setPending(
          snap.docs.map((d) => ({
            email: d.id,
            role: d.data().role,
            createdAt: 0,
          }))
        );
      }
    );
    return unsub;
  }, [setId, isOwner]);

  return pending;
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
  await setDoc(doc(db, "questionSets", setId, "pendingInvites", normalized), {
    role,
    createdAt: serverTimestamp(),
  });
}

export async function cancelInvite(setId: string, email: string) {
  const normalized = normalizeEmail(email);
  await deleteDoc(doc(db, "invites", normalized));
  await deleteDoc(doc(db, "questionSets", setId, "pendingInvites", normalized));
}

// 招待を承諾する：questionSets.members / memberProfiles に自分を追加し、
// 自分宛のinvitesドキュメントとpendingInvitesドキュメントを削除する。
export async function acceptInvite(
  setId: string,
  uid: string,
  role: Role,
  email: string,
  displayName: string
) {
  await updateDoc(doc(db, "questionSets", setId), {
    [`members.${uid}`]: role,
    [`memberProfiles.${uid}`]: { email, displayName },
    updatedAt: serverTimestamp(),
  });
  const normalized = normalizeEmail(email);
  await deleteDoc(doc(db, "invites", normalized));
  await deleteDoc(doc(db, "questionSets", setId, "pendingInvites", normalized));
}
