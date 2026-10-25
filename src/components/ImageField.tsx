"use client";

import { useRef, useState } from "react";
import { ImageOff, ImagePlus, Loader2, X } from "lucide-react";
import { ImageMeta, ImageSlot, MAX_IMAGES, Question } from "@/lib/types";
import { IMAGE_ACCEPT, packQuestionImage } from "@/lib/imageTools";
import { autoId, ImageChange, LoadedImage, NewImage, toMeta, useQuestionImages } from "@/lib/questionImages";

export const slotLabel: Record<ImageSlot, string> = { body: "問題文", answer: "解答", explanation: "解説" };

// 画像の編集中の状態。保存するまで Firestore には何も書かない（追加は圧縮済みの下書き、削除は印だけ）。
export function useImageDraft(initial: ImageMeta[]) {
  const base = useRef(initial);
  const [kept, setKept] = useState<ImageMeta[]>(initial);
  const [added, setAdded] = useState<NewImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const total = kept.length + added.length;

  async function addFiles(field: ImageSlot, files: File[]) {
    setError("");
    const imgs = files.filter((f) => f.type.startsWith("image/"));
    if (imgs.length === 0) return setError("画像ファイルを選んでください");
    if (total + imgs.length > MAX_IMAGES) return setError(`画像は1問につき${MAX_IMAGES}枚までです`);
    setBusy(true);
    try {
      const out: NewImage[] = [];
      for (const f of imgs) out.push({ ...(await packQuestionImage(f)), id: autoId(), field });
      setAdded((a) => [...a, ...out]);
    } catch (e: any) {
      setError(e?.message || "画像を追加できませんでした");
    } finally {
      setBusy(false);
    }
  }

  const removedIds = base.current.filter((m) => !kept.some((k) => k.id === m.id)).map((m) => m.id);
  const change: ImageChange = { add: added, removeIds: removedIds, meta: [...kept, ...added.map(toMeta)] };
  return {
    kept, added, busy, error, total, change,
    dirty: added.length > 0 || removedIds.length > 0,
    addFiles,
    removeKept: (id: string) => setKept((k) => k.filter((m) => m.id !== id)),
    removeAdded: (id: string) => setAdded((a) => a.filter((x) => x.id !== id)),
    reset: () => { setKept(base.current); setAdded([]); setError(""); },
  };
}
export type ImageDraft = ReturnType<typeof useImageDraft>;

export function imageFilesFrom(e: React.ClipboardEvent | React.DragEvent): File[] {
  const list = "clipboardData" in e ? e.clipboardData?.files : e.dataTransfer?.files;
  return Array.from(list ?? []).filter((f) => f.type.startsWith("image/"));
}

// 1つの欄（問題文／解答／解説）の画像。追加は、ボタン・貼り付け・ドラッグ＆ドロップのどれでもできる。
export function ImageField({ field, draft, loaded, disabled }: { field: ImageSlot; draft: ImageDraft; loaded: Record<string, LoadedImage | "error">; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const items = [
    ...draft.kept.filter((m) => m.field === field).map((m) => ({ id: m.id, pending: false, img: loaded[m.id] as LoadedImage | "error" | undefined })),
    ...draft.added.filter((a) => a.field === field).map((a) => ({ id: a.id, pending: true, img: { src: `data:${a.mime};base64,${a.data}`, w: a.w, h: a.h } as LoadedImage })),
  ];
  const full = draft.total >= MAX_IMAGES;
  if (disabled && items.length === 0) return null;

  return (
    <div
      className={`mb-3 rounded-lg ${over ? "bg-brand-50 ring-2 ring-brand-300" : ""}`}
      onDragOver={(e) => { if (!disabled && e.dataTransfer.types.includes("Files")) { e.preventDefault(); setOver(true); } }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { setOver(false); if (disabled) return; const fs = imageFilesFrom(e); if (fs.length) { e.preventDefault(); draft.addFiles(field, fs); } }}
    >
      {items.length > 0 && (
        <ul className="mb-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {items.map((it, i) => (
            <li key={it.id} className="relative aspect-video overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
              {it.img === undefined ? (
                <span className="absolute inset-0 animate-pulse bg-slate-200" aria-label="読み込み中" />
              ) : it.img === "error" ? (
                <span className="flex h-full flex-col items-center justify-center gap-1 text-[11px] text-slate-400"><ImageOff size={16} />読み込めません</span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.img.src} alt={`${slotLabel[field]}の画像 ${i + 1}`} className="h-full w-full object-contain" />
              )}
              {it.pending && <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 text-[10px] text-white">未保存</span>}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => (it.pending ? draft.removeAdded(it.id) : draft.removeKept(it.id))}
                  aria-label={`${slotLabel[field]}の画像 ${i + 1} を削除`}
                  className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                ><X size={14} /></button>
              )}
            </li>
          ))}
        </ul>
      )}
      {!disabled && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={draft.busy || full}
            className="flex min-h-[36px] items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 text-xs text-slate-500 hover:border-brand-300 hover:text-accent disabled:opacity-40"
          >
            {draft.busy ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}{slotLabel[field]}に画像を追加
          </button>
          <span className="text-[11px] text-slate-300">貼り付け・ドラッグ＆ドロップでも追加できます（{draft.total}/{MAX_IMAGES}）</span>
          <input
            ref={input}
            type="file"
            accept={IMAGE_ACCEPT}
            multiple
            hidden
            onChange={(e) => { const fs = Array.from(e.target.files ?? []); e.target.value = ""; if (fs.length) draft.addFiles(field, fs); }}
          />
        </div>
      )}
    </div>
  );
}

// 保存済みの画像を表示するだけの部品（印刷など）。読み込めなかった画像は何も出さない。
export function QuestionImages({ setId, q, field }: { setId: string; q: Pick<Question, "id" | "imageMeta">; field: ImageSlot }) {
  const metas = q.imageMeta.filter((m) => m.field === field);
  const loaded = useQuestionImages(setId, q.id, metas);
  if (metas.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {metas.map((m, i) => {
        const l = loaded[m.id];
        // eslint-disable-next-line @next/next/no-img-element
        return typeof l === "object" ? <img key={m.id} src={l.src} alt={`${slotLabel[field]}の画像 ${i + 1}`} className="max-h-64 max-w-full rounded border border-slate-300 object-contain" /> : null;
      })}
    </div>
  );
}
