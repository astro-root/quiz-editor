import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, where, writeBatch } from "firebase/firestore";
import { deleteUser, GoogleAuthProvider, reauthenticateWithPopup, User } from "firebase/auth";
import { db } from "./firebase";
import { plain } from "./backup";
import { toSet } from "./useQuestionSets";
import { QuestionSet } from "./types";

// 自分が参加している問題セット（ダッシュボードの一覧と、同じ条件で探す）
export async function mySets(uid: string): Promise<QuestionSet[]> {
  const snap = await getDocs(query(collection(db, "questionSets"), where(`members.${uid}`, "in", ["admin", "supervisor", "writer", "checker", "viewer"])));
  return snap.docs.map((d) => toSet(d.id, d.data()));
}

// 自分のデータの書き出し：プロフィール、参加している問題セットの一覧、各セットで自分が作った問題
export async function exportMyData(user: User) {
  const sets = await mySets(user.uid);
  const out = [];
  for (const s of sets) {
    const qs = await getDocs(query(collection(db, "questionSets", s.id, "questions"), where("authorUid", "==", user.uid)));
    out.push({ set: { id: s.id, name: s.name, role: s.members[user.uid], isOwner: s.ownerId === user.uid }, myQuestions: qs.docs.map((d) => ({ id: d.id, ...(plain(d.data()) as Record<string, unknown>) })) });
  }
  const me = (await getDoc(doc(db, "publicProfiles", user.uid))).data();
  return {
    kind: "qraft-my-data", version: 1, exportedAt: new Date().toISOString(),
    account: { uid: user.uid, email: user.email, displayName: user.displayName, handle: me?.handle ?? "", createdAt: user.metadata.creationTime },
    sets: out,
  };
}

export interface DeletionCheck { ownedSets: QuestionSet[]; memberSets: QuestionSet[] }
export async function checkDeletion(uid: string): Promise<DeletionCheck> {
  const sets = await mySets(uid);
  return { ownedSets: sets.filter((s) => s.ownerId === uid), memberSets: sets.filter((s) => s.ownerId !== uid) };
}

// アカウントの削除。①Googleで本人確認 → ②参加している問題セットから抜ける → ③自分のプロフィール・ID・アイコンを消す → ④ログインのアカウントを消す。
// オーナーの問題セットがあるときは、先に、そのセットを削除してもらう（オーナーは、抜けられない設計のため）。
// 作った問題は、問題セットに残る（作成者名は、そのときの表示名のまま）。
export async function deleteMyAccount(user: User, onStep?: (text: string) => void) {
  const { ownedSets, memberSets } = await checkDeletion(user.uid);
  if (ownedSets.length > 0) throw new Error("オーナーの問題セットが残っています。先に、そのセットを削除してください");

  onStep?.("本人確認をしています");
  await reauthenticateWithPopup(user, new GoogleAuthProvider());

  onStep?.("問題セットから抜けています");
  for (const s of memberSets) {
    const members = { ...s.members };
    delete members[user.uid];
    const memberProfiles = { ...s.memberProfiles };
    delete memberProfiles[user.uid];
    const b = writeBatch(db);
    b.update(doc(db, "questionSets", s.id), { members, memberProfiles, updatedAt: serverTimestamp() });
    await b.commit();
  }

  onStep?.("プロフィールを削除しています");
  const handle = (await getDoc(doc(db, "publicProfiles", user.uid))).data()?.handle as string | undefined;
  if (handle) await deleteDoc(doc(db, "handles", handle)).catch(() => { /* すでに無い */ });
  await deleteDoc(doc(db, "avatars", user.uid)).catch(() => { /* アイコンが無い */ });
  await deleteDoc(doc(db, "publicProfiles", user.uid));
  await deleteDoc(doc(db, "users", user.uid));

  onStep?.("アカウントを削除しています");
  await deleteUser(user);
}
