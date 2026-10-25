// ブラウザ上で画像を縮小・再圧縮して、Firestore に保存できる小さな文字列（base64）にする。
// 再圧縮するので、撮影場所などの付加情報（EXIF）は残らない。SVG は受け付けない。

export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const SAFE_MIME = ["image/webp", "image/jpeg", "image/png"];
const MAX_RAW_BYTES = 20 * 1024 * 1024;

export interface Packed { mime: string; data: string; w: number; h: number }

export const isSafeMime = (m: unknown): m is string => typeof m === "string" && SAFE_MIME.includes(m);
export const toDataUrl = (mime: string, data: string) => `data:${mime};base64,${data}`;

async function decode(file: File): Promise<{ source: CanvasImageSource; w: number; h: number; close: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file);
      return { source: bmp, w: bmp.width, h: bmp.height, close: () => bmp.close() };
    } catch { /* 下の方法で読み直す */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { source: img, w: img.naturalWidth, h: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    throw new Error("画像を読み込めませんでした（対応形式：JPEG・PNG・WebP・GIF）");
  }
}

const toBlob = (c: HTMLCanvasElement, type: string, q: number) => new Promise<Blob | null>((res) => c.toBlob(res, type, q));
const toBase64 = (b: Blob) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1] ?? "");
    r.onerror = () => rej(new Error("画像の変換に失敗しました"));
    r.readAsDataURL(b);
  });

// maxChars は base64 文字数の上限。収まるまで、画質→サイズの順に下げていく。
async function pack(file: File, o: { maxSide: number; maxChars: number; square?: boolean }): Promise<Packed> {
  if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) throw new Error("対応している画像は JPEG・PNG・WebP・GIF です");
  if (file.size > MAX_RAW_BYTES) throw new Error("画像のサイズが大きすぎます（20MBまで）");
  const d = await decode(file);
  try {
    // 正方形に切り抜く場合は、中央を使う
    const side = Math.min(d.w, d.h);
    const crop = o.square ? { sx: (d.w - side) / 2, sy: (d.h - side) / 2, sw: side, sh: side } : { sx: 0, sy: 0, sw: d.w, sh: d.h };
    let scale = Math.min(1, o.maxSide / Math.max(crop.sw, crop.sh));
    for (let attempt = 0; attempt < 8; attempt++) {
      const w = Math.max(1, Math.round(crop.sw * scale));
      const h = Math.max(1, Math.round(crop.sh * scale));
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) throw new Error("この環境では画像を変換できません");
      ctx.fillStyle = "#fff"; // 透過部分は白にする（JPEG にも対応するため）
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(d.source, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, w, h);
      for (const q of [0.85, 0.72, 0.6, 0.48]) {
        let blob = await toBlob(c, "image/webp", q);
        if (!blob || blob.type !== "image/webp") blob = await toBlob(c, "image/jpeg", q); // WebP 非対応のブラウザ
        if (blob && isSafeMime(blob.type) && Math.ceil((blob.size * 4) / 3) <= o.maxChars) {
          return { mime: blob.type, data: await toBase64(blob), w, h };
        }
      }
      scale *= 0.8;
      if (Math.max(w, h) < 200) break;
    }
    throw new Error("画像を十分に小さくできませんでした。別の画像をお試しください");
  } finally {
    d.close();
  }
}

// 問題に付ける画像：長辺1280px、約225KB（base64で30万文字）まで
export const packQuestionImage = (f: File) => pack(f, { maxSide: 1280, maxChars: 300_000 });
// アイコン：中央を正方形に切り抜いて192px、約30KB（base64で4万文字）まで
export const packAvatar = (f: File) => pack(f, { maxSide: 192, maxChars: 40_000, square: true });
