import Generator from '@/components/Generator';

export default function Home() {
  return (
    <main>
      <h1>README 한방 생성기</h1>
      <p>프로젝트 설명이나 GitHub 저장소 링크를 넣으면 AI가 README를 만들어 줍니다.</p>
      <Generator />
    </main>
  );
}
