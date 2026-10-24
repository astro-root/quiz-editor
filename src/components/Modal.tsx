"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// ポップアップ。PCでは中央のカード、スマホでは下から出る全幅のシートとして表示する。
// ・Esc／背景のクリックで onRequestClose を呼ぶ（未保存の確認は呼び出し側で行う）
// ・開いている間は背面のスクロールを止め、Tab キーの移動をポップアップ内に閉じ込める
// ・閉じたら、開く前にフォーカスしていた要素にフォーカスを戻す
// body 直下に描画する（親に transform があると position: fixed が崩れるため）。
export function Modal({ onRequestClose, label, children }: { onRequestClose: () => void; label: string; children: ReactNode }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onRequestClose);
  closeRef.current = onRequestClose;
  const [opener] = useState(() => (typeof document !== "undefined" ? document.activeElement : null));

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
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
      document.body.style.overflow = prevOverflow;
      if (opener instanceof HTMLElement && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, [opener]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-6"
      onMouseDown={(e) => { if (e.target === e.currentTarget) closeRef.current(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="max-h-[92dvh] w-full overflow-y-auto overscroll-contain rounded-t-2xl bg-surface shadow-pop sm:max-h-[88dvh] sm:max-w-3xl sm:rounded-2xl"
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
