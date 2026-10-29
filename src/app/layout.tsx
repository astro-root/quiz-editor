import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/lib/theme";

const DESCRIPTION = "問題を書く手を、止めない。競技クイズの作問から、裏どり・採用・出題順・印刷まで。チームで一つの問題セットを仕上げるための専用エディタ。";

export const metadata: Metadata = {
  title: { default: "Qraft — クイズ作問エディタ", template: "%s | Qraft" },
  description: DESCRIPTION,
  applicationName: "Qraft",
  openGraph: { title: "Qraft — クイズ作問エディタ", description: DESCRIPTION, siteName: "Qraft", locale: "ja_JP", type: "website" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
