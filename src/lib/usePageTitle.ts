import { useEffect } from "react";

// クライアント側で決まるタイトル（セット名など）をブラウザのタブに表示する。
// ページを直接開いたときは、Next.js が既定のタイトルをあとから書き込むことがあるので、
// 書き換えられたら設定し直す。ほかの画面へ移ったあとは何もせず、次の画面のタイトルに任せる。
export function usePageTitle(title: string) {
  useEffect(() => {
    const path = location.pathname;
    const apply = () => {
      if (location.pathname !== path) return; // 別の画面に移っている
      if (document.title !== title) document.title = title;
    };
    apply();
    const mo = new MutationObserver(apply);
    mo.observe(document.head, { childList: true, characterData: true, subtree: true });
    return () => mo.disconnect();
  }, [title]);
}
