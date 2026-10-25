import { deleteDoc, doc, getDoc, getDocFromCache, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { isSafeMime, Packed, toDataUrl } from "./imageTools";

// アイコン画像は avatars/{uid} に小さく保存し、プロフィール上の photoURL には「参照」を入れる。
// 参照は https の形をしているが、実在しないドメイン（.invalid）で、Avatar 部品が検出して画像を読み込む。
// 既存の https の画像URLは、そのまま表示される。
export const AVATAR_PREFIX = "https://qraft.invalid/avatar/";
export const avatarRef = (uid: string, v: number) => `${AVATAR_PREFIX}${uid}?v=${v}`;

export function parseAvatarRef(url: string): { uid: string; v: number } | null {
  if (!url.startsWith(AVATAR_PREFIX)) return null;
  const [uid, q] = url.slice(AVATAR_PREFIX.length).split("?v=");
  const v = Number(q);
  if (!/^[A-Za-z0-9]{6,64}$/.test(uid ?? "") || !Number.isFinite(v)) return null;
  return { uid, v };
}

const cache = new Map<string, Promise<string>>();
export function loadAvatar(url: string): Promise<string> {
  const hit = cache.get(url);
  if (hit) return hit;
  const ref = parseAvatarRef(url);
  if (!ref) return Promise.reject(new Error("bad avatar ref"));
  const p = (async () => {
    const r = doc(db, "avatars", ref.uid);
    let snap = await getDocFromCache(r).catch(() => null);
    // 保存されている版が参照の版と違えば（古いキャッシュ）、サーバーから読み直す
    if (!snap || !snap.exists() || snap.data().v !== ref.v) snap = await getDoc(r);
    if (!snap.exists()) throw new Error("no avatar");
    const d = snap.data();
    if (typeof d.data !== "string" || !isSafeMime(d.mime)) throw new Error("invalid avatar");
    return toDataUrl(d.mime, d.data);
  })();
  cache.set(url, p);
  p.catch(() => cache.delete(url));
  return p;
}

// 保存して、プロフィールに入れる参照を返す
export async function saveAvatar(uid: string, img: Packed): Promise<string> {
  const v = Date.now();
  await setDoc(doc(db, "avatars", uid), { mime: img.mime, data: img.data, v, updatedAt: serverTimestamp() });
  return avatarRef(uid, v);
}
export async function removeAvatar(uid: string) {
  await deleteDoc(doc(db, "avatars", uid)).catch(() => {});
}
