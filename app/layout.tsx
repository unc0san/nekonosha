import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "猫脳社 NEKONOSHA — 猫と、はたらく。",
  description: "猫たちがAI社員として働く、レトロなピクセルアートのオフィス管理アプリ。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
