import { addDoc, collection, deleteDoc, doc, getDocs, limit, orderBy, query, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { toMillis } from "./time";

// お知らせ。全員向け（broadcasts）と、個人向け（userNotices/{uid}/items）がある。
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

// 既読は、ブラウザに記録する（サーバーには書かない）。「すべて既読」にした時刻 before と、個別に既読にした印 ids の2つ。
const readKey = (uid: string) => `qraft:notices:read:${uid}`;
export const noticeKey = (n: Notice) => `${n.scope}:${n.id}`;
interface ReadState { before: number; ids: string[] }

export function getReadState(uid: string): ReadState {
  try {
    const raw = JSON.parse(localStorage.getItem(readKey(uid)) ?? "null");
    if (raw && typeof raw.before === "number" && Array.isArray(raw.ids)) return { before: raw.before, ids: raw.ids.filter((x: unknown) => typeof x === "string") };
  } catch { /* noop */ }
  return { before: 0, ids: [] };
}
function saveReadState(uid: string, st: ReadState) {
  try { localStorage.setItem(readKey(uid), JSON.stringify({ before: st.before, ids: st.ids.slice(-300) })); } catch { /* noop */ }
}
export const isUnread = (n: Notice, st: ReadState) => n.createdAt > st.before && !st.ids.includes(noticeKey(n));

export function markRead(uid: string, n: Notice): ReadState {
  const st = getReadState(uid);
  if (!st.ids.includes(noticeKey(n))) st.ids.push(noticeKey(n));
  saveReadState(uid, st);
  return st;
}
export function markAllRead(uid: string, items: Notice[]): ReadState {
  const st: ReadState = { before: Math.max(getReadState(uid).before, ...items.map((n) => n.createdAt)), ids: [] };
  saveReadState(uid, st);
  return st;
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
