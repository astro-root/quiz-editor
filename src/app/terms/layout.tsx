import type { Metadata } from "next";

// ブラウザのタブに出るページ名
export const metadata: Metadata = { title: "利用規約" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
