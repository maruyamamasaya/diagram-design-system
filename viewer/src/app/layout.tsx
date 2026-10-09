import { headers } from "next/headers";
import "./style.css";
export const metadata = {
  title: "図解ライブラリ",
  robots: { index: false, follow: false },
};
export const viewport = { width: "device-width", initialScale: 1 };
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  await headers();
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
