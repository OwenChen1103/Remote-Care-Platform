import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '遠端照護平台 - Admin',
  description: '遠端照護平台管理後台',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  );
}
