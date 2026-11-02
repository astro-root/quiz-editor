import { Plus } from "lucide-react";

// スマホで親指が届く右下の「＋」ボタン（画面が広いときは、ページ上部のボタンを使うので表示しない）
export function Fab({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="fixed right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-pop hover:bg-brand-700 sm:hidden"
      style={{ bottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <Plus size={26} />
    </button>
  );
}
