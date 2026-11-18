import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

// ブラウザから、JSON のファイルとして保存する
export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// Firestore の値（タイムスタンプなど）を、JSON にできる形にする
export function plain(v: unknown): unknown {
  if (v === null || typeof v !== "object") return v;
  const anyV = v as { toMillis?: () => number; toDate?: () => Date };
  if (typeof anyV.toMillis === "function") return new Date(anyV.toMillis()).toISOString();
  if (Array.isArray(v)) return v.map(plain);
  return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, plain(x)]));
}

export const stamp = () => new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");

// 問題セット1つの、全データ。設定・メンバー・すべての問題（ゴミ箱を含む）。画像は、指定したときだけ（大きくなる）。
export async function backupSet(setId: string, set: Record<string, unknown>, includeImages: boolean) {
  const qs = await getDocs(collection(db, "questionSets", setId, "questions"));
  const questions = [];
  for (const d of qs.docs) {
    const q: Record<string, unknown> = { id: d.id, ...(plain(d.data()) as Record<string, unknown>) };
    if (includeImages) {
      const imgs = await getDocs(collection(db, "questionSets", setId, "questions", d.id, "images"));
      q.images = imgs.docs.map((i) => ({ id: i.id, ...(plain(i.data()) as Record<string, unknown>) }));
    }
    questions.push(q);
  }
  return { kind: "qraft-set-backup", version: 1, exportedAt: new Date().toISOString(), includesImages: includeImages, set: plain(set), questions };
}
