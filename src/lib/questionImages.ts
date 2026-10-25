import { collection, deleteDoc, doc, getDoc, getDocFromCache, serverTimestamp, writeBatch } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "./firebase";
import { ImageMeta, ImageSlot } from "./types";
import { isSafeMime, Packed, toDataUrl } from "./imageTools";

export interface NewImage extends Packed { id: string; field: ImageSlot }
export interface LoadedImage { src: string; w: number; h: number }
// 保存時にまとめて渡す変更：追加する画像、消す画像のID、保存後の目録
export interface ImageChange { add: NewImage[]; removeIds: string[]; meta: ImageMeta[] }

export const toMeta = ({ id, field, w, h }: NewImage): ImageMeta => ({ id, field, w, h });

export function cleanMeta(v: unknown): ImageMeta[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((m) => m && typeof m.id === "string" && (m.field === "body" || m.field === "answer" || m.field === "explanation"))
    .map((m) => ({ id: m.id as string, field: m.field as ImageSlot, w: Number(m.w) || 0, h: Number(m.h) || 0 }));
}

// ネットワークに出ずに新しいIDだけを作る
export const autoId = () => doc(collection(db, "ids")).id;

const imgRef = (setId: string, qid: string, id: string) => doc(db, "questionSets", setId, "questions", qid, "images", id);

// 画像は作成後に変わらない（差し替えは新しいIDになる）ので、キャッシュを優先して読み取り回数を抑える
async function firestoreLoader(setId: string, qid: string, id: string): Promise<LoadedImage> {
  const ref = imgRef(setId, qid, id);
  let snap = await getDocFromCache(ref).catch(() => null);
  if (!snap || !snap.exists()) snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("not found");
  const d = snap.data();
  if (typeof d.data !== "string" || !isSafeMime(d.mime)) throw new Error("invalid image");
  return { src: toDataUrl(d.mime, d.data), w: Number(d.w) || 0, h: Number(d.h) || 0 };
}

let loader: (setId: string, qid: string, id: string) => Promise<LoadedImage> = firestoreLoader;
export function __setImageLoader(fn: typeof loader) { loader = fn; cache.clear(); } // テスト用

const cache = new Map<string, Promise<LoadedImage>>();
const MAX_CACHE = 80;
export function loadImage(setId: string, qid: string, id: string): Promise<LoadedImage> {
  const key = `${setId}/${qid}/${id}`;
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit); // 使った順に並べ直す
    return hit;
  }
  const p = loader(setId, qid, id);
  cache.set(key, p);
  p.catch(() => cache.delete(key)); // 失敗は覚えない（再度開けば読み直す）
  while (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value as string);
  return p;
}

// 権限のエラーを避けるため、書き込みは少数ずつに分けて行う
export async function writeImages(setId: string, qid: string, uid: string, imgs: NewImage[]) {
  for (let i = 0; i < imgs.length; i += 4) {
    const b = writeBatch(db);
    imgs.slice(i, i + 4).forEach((im) =>
      b.set(imgRef(setId, qid, im.id), {
        data: im.data, mime: im.mime, field: im.field, w: im.w, h: im.h, authorUid: uid, createdAt: serverTimestamp(),
      })
    );
    await b.commit();
  }
}

export async function deleteImages(setId: string, items: { qid: string; id: string }[]) {
  for (let i = 0; i < items.length; i += 5) {
    const b = writeBatch(db);
    items.slice(i, i + 5).forEach((x) => b.delete(imgRef(setId, x.qid, x.id)));
    await b.commit();
  }
}
export async function deleteImage(setId: string, qid: string, id: string) {
  await deleteDoc(imgRef(setId, qid, id));
}

// 問題の画像を読み込む。結果は { 画像ID: 読み込めた画像 | "error" }。読み込み中のIDはまだ入らない。
export function useQuestionImages(setId: string, qid: string, metas: ImageMeta[]) {
  const [state, setState] = useState<Record<string, LoadedImage | "error">>({});
  const key = metas.map((m) => m.id).join(",");
  useEffect(() => {
    let alive = true;
    metas.forEach((m) =>
      loadImage(setId, qid, m.id)
        .then((img) => alive && setState((s) => ({ ...s, [m.id]: img })))
        .catch(() => alive && setState((s) => ({ ...s, [m.id]: "error" })))
    );
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setId, qid, key]);
  return state;
}
