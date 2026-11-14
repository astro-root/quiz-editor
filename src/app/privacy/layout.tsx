import type { Metadata } from "next";

// ブラウザのタブに出るページ名
export const metadata: Metadata = { title: "プライバシーポリシー" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
