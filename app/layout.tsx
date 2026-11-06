import type { Metadata } from 'next';
import './globals.css';
import CoffeeFloating from '@/components/CoffeeFloating';

export const metadata: Metadata = {
  title: 'RepoPilot',
  description: 'GitHub 저장소 링크로 README, 진단, 이력서 문구, 면접 질문, 포트폴리오 가이드를 만들어 주는 도구',
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
