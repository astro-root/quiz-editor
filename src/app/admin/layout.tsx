import type { Metadata } from "next";

// ブラウザのタブに出るページ名
export const metadata: Metadata = { title: "管理", robots: { index: false, follow: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
