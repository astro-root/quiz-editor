import type { Metadata } from "next";

// ブラウザのタブに出るページ名（ページ本体はクライアント側の処理なので、ここで指定する）
export const metadata: Metadata = { title: "問題セット" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
