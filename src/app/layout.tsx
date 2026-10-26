import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '날씨의 기록 · 서울 기온 정보판',
  description: '서울의 모델 기반 기온과 출처 시각을 확인하고, KST 날짜별로 기록합니다.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
