import Generator from '@/components/Generator';

export default function Home() {
  return (
    <main>
      <header className="hero">
        <span className="badge">AI · README · 이력서 · 면접 질문</span>
        <h1>RepoPilot</h1>
        <p>저장소 링크 하나로 README, 강점·개선점, 이력서 3줄, 면접 질문까지</p>
      </header>
      <Generator />
    </main>
  );
}
