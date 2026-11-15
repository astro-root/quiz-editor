"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// ポップアップ。PCでは中央のカード、スマホでは下から出る全幅のシートとして表示する。
// ・Esc／背景のクリックで onRequestClose を呼ぶ（未保存の確認は呼び出し側で行う）
// ・開いている間は背面のスクロールを止め、Tab キーの移動をポップアップ内に閉じ込める
//   背面のスクロールは、overflow: hidden では止めない（縦スクロールバーが消えて、画面の幅がずれるため）。
//   代わりに、ポップアップの外側でのホイール・タッチの動きを無効にし、ポップアップの中は overscroll-contain で背面に伝えない。
// ・閉じたら、開く前にフォーカスしていた要素にフォーカスを戻す
// body 直下に描画する（親に transform があると position: fixed が崩れるため）。
export function Modal({ onRequestClose, label, children, size = "lg", onKeyDown }: { onRequestClose: () => void; label: string; children: ReactNode; size?: "md" | "lg"; onKeyDown?: (e: React.KeyboardEvent) => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onRequestClose);
  closeRef.current = onRequestClose;
  const [opener] = useState(() => (typeof document !== "undefined" ? document.activeElement : null));

  useEffect(() => {
    // 背面のスクロールを止める（スクロールバーは、そのまま残す）
    const overlay = overlayRef.current;
    const blockOutside = (e: Event) => {
      const panel = panelRef.current;
      if (!panel || !panel.contains(e.target as Node)) { e.preventDefault(); return; }
      // 中身が短くてスクロールできないポップアップでは、中でのホイールも背面に伝わらないようにする
      if (e.type === "wheel" && panel.scrollHeight <= panel.clientHeight && !(e.target as HTMLElement).closest("textarea, select")) e.preventDefault();
    };
    overlay?.addEventListener("wheel", blockOutside, { passive: false });
    overlay?.addEventListener("touchmove", blockOutside, { passive: false });
    // キーボード（スペース・矢印）で、背面ではなくポップアップがスクロールするよう、フォーカスをポップアップに置く
    if (panelRef.current && !panelRef.current.contains(document.activeElement)) panelRef.current.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!panelRef.current.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      overlay?.removeEventListener("wheel", blockOutside);
      overlay?.removeEventListener("touchmove", blockOutside);
      if (opener instanceof HTMLElement && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, [opener]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-6"
      onMouseDown={(e) => { if (e.target === e.currentTarget) closeRef.current(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={`outline-none max-h-[92dvh] w-full overflow-y-auto overscroll-contain rounded-t-2xl bg-surface shadow-pop sm:max-h-[88dvh] sm:rounded-2xl ${size === "md" ? "sm:max-w-md" : "sm:max-w-3xl"}`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
