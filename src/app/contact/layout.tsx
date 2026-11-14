import type { Metadata } from "next";

// ブラウザのタブに出るページ名
export const metadata: Metadata = { title: "お問い合わせ" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
