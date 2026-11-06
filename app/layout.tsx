import type { Metadata } from 'next';
import './globals.css';
import CoffeeFloating from '@/components/CoffeeFloating';

export const metadata: Metadata = {
  title: 'README Generator',
  description: 'README Generator 해커톤 프로젝트',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        {children}
        <CoffeeFloating />
      </body>
    </html>
  );
}
