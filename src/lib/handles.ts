import { doc, getDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { normalizeText } from "./search";

// ユーザーID：英数字・アンダースコア・ピリオドだけ、3〜20文字。英字は小文字に統一する（大文字小文字の違いでは、別のIDにならない）。
// 重複は、handles/{id} の文書IDが同じになることで防ぐ（作成のみ許可・更新不可なので、先に取った人のものになる）。
export const HANDLE_MIN = 3;
export const HANDLE_MAX = 20;
export const HANDLE_RESERVED = ["admin", "administrator", "qraft", "support", "root", "system", "official"];

export const normalizeHandle = (raw: string) => raw.trim().replace(/^@/, "").toLowerCase();

// 問題なければ null、問題があれば、画面に出す文言を返す
export function validateHandle(raw: string): string | null {
  const h = normalizeHandle(raw);
  if (h.length < HANDLE_MIN || h.length > HANDLE_MAX) return `${HANDLE_MIN}〜${HANDLE_MAX}文字で入力してください`;
  if (!/^[a-z0-9_.]+$/.test(h)) return "使えるのは、英数字・アンダースコア（_）・ピリオド（.）だけです";
  if (h.startsWith(".") || h.endsWith(".")) return "ピリオドは、先頭と末尾には使えません";
  if (h.includes("..")) return "ピリオドは、2つ続けて使えません";
  if (HANDLE_RESERVED.includes(h)) return "このIDは使えません";
  return null;
}

export async function getMyHandle(uid: string): Promise<string> {
  const s = await getDoc(doc(db, "publicProfiles", uid));
  return typeof s.data()?.handle === "string" ? s.data()!.handle : "";
}

export async function isHandleTaken(handle: string, myUid: string): Promise<boolean> {
  const s = await getDoc(doc(db, "handles", normalizeHandle(handle)));
  return s.exists() && s.data().uid !== myUid;
}

// 古いIDを手放し、新しいIDを取り、公開プロフィールに書く。1回のバッチなので、途中までは反映されない。
export async function saveHandle(uid: string, current: string, next: string) {
  const n = normalizeHandle(next);
  const err = validateHandle(n);
  if (err) throw new Error(err);
  if (n === current) return;
  const batch = writeBatch(db);
  if (current) batch.delete(doc(db, "handles", current));
  batch.set(doc(db, "handles", n), { uid, createdAt: serverTimestamp() });
  batch.set(doc(db, "publicProfiles", uid), { handle: n, updatedAt: serverTimestamp() }, { merge: true });
  try {
    await batch.commit();
  } catch (e: any) {
    if (e?.code === "permission-denied") throw new Error("そのIDは使えません（すでに使われているか、使えない文字が含まれています）");
    throw e;
  }
}

// ---------- 初期IDの自動作成 ----------
// メールアドレスや本名から作ると、そこから個人が分かってしまうので、ランダムな文字列にする。
const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
export function randomHandle(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return "user_" + Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

// 重複したら（作成が拒否されたら）、別のIDで数回やり直す。作れたIDを返す。作れなければ ""
async function claimRandom(write: (handle: string, batch: ReturnType<typeof writeBatch>) => void, uid: string): Promise<string> {
  for (let i = 0; i < 6; i++) {
    const h = randomHandle();
    const batch = writeBatch(db);
    batch.set(doc(db, "handles", h), { uid, createdAt: serverTimestamp() });
    write(h, batch);
    try {
      await batch.commit();
      return h;
    } catch (e: any) {
      if (e?.code !== "permission-denied") throw e;
    }
  }
  return "";
}

// 初めてのログイン：公開プロフィールを、ランダムなIDと、それと同じ表示名で作る（Googleの名前は使わない）
export function createProfileWithRandomHandle(uid: string): Promise<string> {
  return claimRandom((h, batch) => {
    batch.set(doc(db, "publicProfiles", uid), { displayName: h, displayNameLower: normalizeText(h), photoURL: "", handle: h, updatedAt: serverTimestamp() }, { merge: true });
  }, uid);
}

// すでにアカウントがあるが、IDを持っていない人に、ランダムなIDをつける（表示名はそのまま）
export function assignRandomHandle(uid: string): Promise<string> {
  return claimRandom((h, batch) => {
    batch.set(doc(db, "publicProfiles", uid), { handle: h, updatedAt: serverTimestamp() }, { merge: true });
  }, uid);
}
