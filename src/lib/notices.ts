import { addDoc, collection, deleteDoc, doc, getDocs, limit, orderBy, query, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { toMillis } from "./time";

// お知らせ。全員向け（broadcasts）と、個人向け（userNotices/{uid}/items）がある。
// 既読は、無料枠のために、サーバーには書かず、ブラウザに「最後に見た時刻」だけを残す。
export interface Notice {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  scope: "all" | "me";
}

const toNotice = (id: string, d: Record<string, any>, scope: Notice["scope"]): Notice => ({
  id, scope, title: d.title ?? "", body: d.body ?? "", createdAt: toMillis(d.createdAt),
});

export async function fetchNotices(uid: string, max = 15): Promise<Notice[]> {
  const [all, mine] = await Promise.all([
    getDocs(query(collection(db, "broadcasts"), orderBy("createdAt", "desc"), limit(max))),
    getDocs(query(collection(db, "userNotices", uid, "items"), orderBy("createdAt", "desc"), limit(max))),
  ]);
  return [...all.docs.map((d) => toNotice(d.id, d.data(), "all")), ...mine.docs.map((d) => toNotice(d.id, d.data(), "me"))]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, max);
}

const seenKey = (uid: string) => `qraft:notices:seen:${uid}`;
export function getSeen(uid: string): number {
  try { return Number(localStorage.getItem(seenKey(uid))) || 0; } catch { return 0; }
}
export function setSeen(uid: string, at: number) {
  try { localStorage.setItem(seenKey(uid), String(at)); } catch { /* noop */ }
}

// 運営者が送る。target は "all"（全員）か、相手の uid
export async function sendNotice(target: "all" | string, title: string, body: string) {
  const data = { title: title.trim(), body: body.trim(), createdAt: serverTimestamp() };
  if (!data.title) throw new Error("件名を入力してください");
  if (data.title.length > 60) throw new Error("件名は60文字以内にしてください");
  if (data.body.length > 1000) throw new Error("本文は1000文字以内にしてください");
  if (target === "all") await addDoc(collection(db, "broadcasts"), data);
  else await addDoc(collection(db, "userNotices", target, "items"), data);
}

export const deleteBroadcast = (id: string) => deleteDoc(doc(db, "broadcasts", id));
