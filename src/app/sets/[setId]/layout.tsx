import { SetLayoutClient } from "./SetLayoutClient";

// 問題セットのIDは、実行時にしか決まらない。空の一覧を返しておくと、タブを移るたびにサーバーで作り直すのではなく、
// 最初に開いたときに1度だけ作られ、そのあとは配信用のキャッシュから返る（画面の中身は、ブラウザ側で読み込む）。
export function generateStaticParams() {
  return [];
}

export default function SetLayout({ children }: { children: React.ReactNode }) {
  return <SetLayoutClient>{children}</SetLayoutClient>;
}
