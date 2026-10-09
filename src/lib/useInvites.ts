"use client";

import { useEffect, useState } from "react";
import {
  collection, deleteDoc, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp,
  setDoc, updateDoc, where, writeBatch, endAt, startAt,
} from "firebase/firestore";
import { db } from "./firebase";
import { Invite, PendingInvite, PublicProfile, QuestionSet, Role, SetInvite } from "./types";
import { useAuth } from "./auth-context";
import { normalizeText } from "./search";

// ---------- ユーザー検索（表示名の前方一致。メールアドレスは扱わない） ----------
export async function searchUsers(text: string, max = 20): Promise<PublicProfile[]> {
  const t = normalizeText(text.trim());
  if (!t) return [];
  const snap = await getDocs(
    query(collection(db, "publicProfiles"), orderBy("displayNameLower"), startAt(t), endAt(t + "\uf8ff"), limit(max))
  );
  return snap.docs.map((d) => ({
    uid: d.id,
    displayName: d.data().displayName ?? "",
    photoURL: d.data().photoURL ?? "",
  }));
}

// ---------- 新方式：ユーザーを選んで招待 ----------
// setInvites/{setId}_{uid}  : 招待された本人が読む（ダッシュボードの通知）
// questionSets/{setId}/pendingInvites/{uid} : 管理者が「招待中」一覧を見る
export async function inviteUser(set: QuestionSet, inviter: { uid: string; name: string }, target: PublicProfile, role: Role) {
  if (target.uid === inviter.uid) throw new Error("自分自身は招待できません");
  if (set.members[target.uid]) throw new Error(`${target.displayName} さんはすでにメンバーです`);
  const inviteRef = doc(db, "setInvites", `${set.id}_${target.uid}`);
  const existing = await getDoc(inviteRef).catch(() => null);
  if (existing?.exists()) throw new Error(`${target.displayName} さんはすでに招待済みです`);
  const batch = writeBatch(db);
  batch.set(inviteRef, {
    setId: set.id, setName: set.name, role, inviteeUid: target.uid,
    invitedBy: inviter.uid, inviterName: inviter.name, createdAt: serverTimestamp(),
  });
  batch.set(doc(db, "questionSets", set.id, "pendingInvites", target.uid), {
    role, displayName: target.displayName, photoURL: target.photoURL, createdAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function cancelUserInvite(setId: string, uid: string) {
  const batch = writeBatch(db);
  batch.delete(doc(db, "setInvites", `${setId}_${uid}`));
  batch.delete(doc(db, "questionSets", setId, "pendingInvites", uid));
  await batch.commit();
}

export function usePendingInvites(setId: string, isAdmin: boolean) {
  const [pending, setPending] = useState<PendingInvite[]>([]);
  useEffect(() => {
    if (!setId || !isAdmin) {
      setPending([]);
      return;
    }
    return onSnapshot(
      collection(db, "questionSets", setId, "pendingInvites"),
      (snap) =>
        setPending(
          snap.docs.map((d) => ({
            uid: d.id,
            role: d.data().role,
            displayName: d.data().displayName ?? "",
            photoURL: d.data().photoURL ?? "",
          }))
        ),
      (e) => console.error("招待中一覧の取得に失敗しました", e)
    );
  }, [setId, isAdmin]);
  return pending;
}

export function useMyInvites() {
  const { user } = useAuth();
  const [invites, setInvites] = useState<SetInvite[]>([]);
  const [legacy, setLegacy] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setInvites([]);
      setLegacy(null);
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(
      query(collection(db, "setInvites"), where("inviteeUid", "==", user.uid)),
      (snap) => {
        setInvites(
          snap.docs.map((d) => ({
            id: d.id,
            setId: d.data().setId,
            setName: d.data().setName ?? "",
            role: d.data().role,
            inviteeUid: user.uid,
            invitedBy: d.data().invitedBy ?? "",
            inviterName: d.data().inviterName ?? "",
          }))
        );
        setLoading(false);
      },
      (e) => {
        console.error("招待の取得に失敗しました", e);
        setLoading(false);
      }
    );
    // 旧方式（メール宛）の招待が残っている場合のみ拾う
    if (user.email) {
      getDoc(doc(db, "invites", normalizeEmail(user.email)))
        .then((s) => setLegacy(s.exists() ? (s.data() as Invite) : null))
        .catch(() => setLegacy(null));
    }
    return unsub;
  }, [user]);

  return { invites, legacy, loading };
}

export async function acceptUserInvite(inv: SetInvite, me: { uid: string; email: string; displayName: string; photoURL: string }) {
  await updateDoc(doc(db, "questionSets", inv.setId), {
    [`members.${me.uid}`]: inv.role,
    [`memberProfiles.${me.uid}`]: { email: me.email, displayName: me.displayName, photoURL: me.photoURL },
    updatedAt: serverTimestamp(),
  });
  const batch = writeBatch(db);
  batch.delete(doc(db, "setInvites", inv.id));
  batch.delete(doc(db, "questionSets", inv.setId, "pendingInvites", me.uid));
  await batch.commit().catch((e) => console.error("招待の後片付けに失敗しました", e));
}

export async function declineUserInvite(inv: SetInvite) {
  await cancelUserInvite(inv.setId, inv.inviteeUid);
}

// ---------- 旧方式（メール）。既存の招待を受け取れるように残す ----------
export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
export async function acceptLegacyInvite(inv: Invite, me: { uid: string; email: string; displayName: string; photoURL: string }) {
  await updateDoc(doc(db, "questionSets", inv.setId), {
    [`members.${me.uid}`]: inv.role,
    [`memberProfiles.${me.uid}`]: { email: me.email, displayName: me.displayName, photoURL: me.photoURL },
    updatedAt: serverTimestamp(),
  });
  const n = normalizeEmail(me.email);
  await deleteDoc(doc(db, "invites", n)).catch(() => {});
  await deleteDoc(doc(db, "questionSets", inv.setId, "pendingInvites", n)).catch(() => {});
}
