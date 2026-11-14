import { collection, deleteDoc, doc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { toMillis } from "./time";
import { QuestionSet, Question } from "./types";
import { toSet } from "./useQuestionSets";
import { normalizeQuestion } from "./QuestionsContext";

// 運営者の管理ページ用の読み書き。ここで読めるのは、運営者だけ（firestore.rules が守っている）。
export interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  handle: string;
  createdAt: number;
  banned: boolean;
  banReason: string;
}

export async function loadAccounts(): Promise<AdminUser[]> {
  const [users, profiles, bans] = await Promise.all([
    getDocs(collection(db, "users")),
    getDocs(collection(db, "publicProfiles")),
    getDocs(collection(db, "bans")),
  ]);
  const prof = new Map(profiles.docs.map((d) => [d.id, d.data()]));
  const ban = new Map(bans.docs.map((d) => [d.id, d.data()]));
  return users.docs
    .map((d) => {
      const x = d.data();
      const p = prof.get(d.id);
      const b = ban.get(d.id);
      return {
        uid: d.id,
        email: x.email ?? "",
        displayName: p?.displayName ?? x.displayName ?? "",
        handle: p?.handle ?? "",
        createdAt: toMillis(x.createdAt),
        banned: !!b,
        banReason: b?.reason ?? "",
      } as AdminUser;
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

export const banUser = (adminUid: string, uid: string, reason: string) =>
  setDoc(doc(db, "bans", uid), { reason: reason.trim().slice(0, 500), bannedBy: adminUid, createdAt: serverTimestamp() });
export const unbanUser = (uid: string) => deleteDoc(doc(db, "bans", uid));

export async function loadSets(): Promise<QuestionSet[]> {
  const snap = await getDocs(collection(db, "questionSets"));
  return snap.docs.map((d) => toSet(d.id, d.data())).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function loadQuestions(setId: string): Promise<Question[]> {
  const snap = await getDocs(query(collection(db, "questionSets", setId, "questions"), orderBy("order", "asc")));
  return snap.docs.map((d) => normalizeQuestion(d.id, d.data()));
}

export interface AdminContact {
  id: string;
  name: string;
  email: string;
  category: string;
  message: string;
  uid: string;
  status: "new" | "done";
  createdAt: number;
}
export async function loadContacts(max = 200): Promise<AdminContact[]> {
  const snap = await getDocs(query(collection(db, "contacts"), orderBy("createdAt", "desc"), limit(max)));
  return snap.docs.map((d) => {
    const x = d.data();
    return { id: d.id, name: x.name ?? "", email: x.email ?? "", category: x.category ?? "other", message: x.message ?? "", uid: x.uid ?? "", status: x.status === "done" ? "done" : "new", createdAt: toMillis(x.createdAt) };
  });
}
export const setContactStatus = (id: string, status: "new" | "done") => updateDoc(doc(db, "contacts", id), { status });
export const deleteContact = (id: string) => deleteDoc(doc(db, "contacts", id));
export const contactCategoryLabel: Record<string, string> = {
  service: "サービスについて", bug: "不具合の報告", account: "アカウントについて", legal: "規約・ポリシー", other: "その他",
};
