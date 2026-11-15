"use client";

import { ReactNode, useCallback, useState } from "react";
import { Modal } from "./Modal";

interface Opts {
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  danger?: boolean; // 取り返しのつかない操作。キャンセルに最初のフォーカスを置き、確認ボタンを赤くする
}

// ブラウザ標準の confirm() の代わり。標準の確認は、見た目も操作性もブラウザ任せで、押しにくい。
// 使い方：const [ask, dialog] = useConfirm(); … if (!(await ask({ title: "…" }))) return; … 画面のどこかに {dialog} を置く
export function useConfirm(): [(o: Opts) => Promise<boolean>, ReactNode] {
  const [state, setState] = useState<(Opts & { resolve: (v: boolean) => void }) | null>(null);
  const ask = useCallback((o: Opts) => new Promise<boolean>((resolve) => setState({ ...o, resolve })), []);
  const close = (v: boolean) => { state?.resolve(v); setState(null); };
  const dialog = state ? (
    <Modal size="md" label={state.title} onRequestClose={() => close(false)}>
      <div className="p-5 sm:p-6">
        <h2 className="mb-2 text-base font-semibold text-slate-800">{state.title}</h2>
        {state.body && <div className="mb-5 text-sm leading-relaxed text-slate-600">{state.body}</div>}
        <div className="flex flex-wrap justify-end gap-2">
          <button autoFocus={state.danger} onClick={() => close(false)} className="min-h-[44px] rounded-lg border border-slate-200 bg-surface px-5 text-sm text-slate-600 hover:bg-slate-50">キャンセル</button>
          <button autoFocus={!state.danger} onClick={() => close(true)} className={`min-h-[44px] rounded-lg px-5 text-sm font-medium text-white ${state.danger ? "bg-rose-600 hover:bg-rose-700" : "bg-brand-600 hover:bg-brand-700"}`}>{state.confirmLabel ?? "OK"}</button>
        </div>
      </div>
    </Modal>
  ) : null;
  return [ask, dialog];
}
