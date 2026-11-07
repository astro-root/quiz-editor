import type { Metadata } from "next";

// ブラウザのタブに出るページ名（ページ本体はクライアント側の処理なので、ここで指定する）
export const metadata: Metadata = { title: "新規登録" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
