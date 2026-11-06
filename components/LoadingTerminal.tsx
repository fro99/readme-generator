const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

// 터미널 스타일 로딩 표시. 서버가 진행 상태를 알려 주지 않으므로 단계는 "경과 시간 기준"으로만 바꾼다.
// 가짜 진행률(%)은 쓰지 않고, 마지막 단계(결과 정리)는 응답이 올 때까지 ○로 둔다.
export default function LoadingTerminal({
  elapsed,
  first,
  firstSeconds,
  hint,
}: {
  elapsed: number; // 경과 초
  first: string; // 첫 단계 이름 (예: 저장소 읽는 중)
  firstSeconds: number; // 첫 단계를 완료로 표시하는 경과 초 (0이면 처음부터 ✓)
  hint: string;
}) {
  const firstDone = elapsed >= firstSeconds;
  const steps: { label: string; st: 'done' | 'active' | 'wait' }[] = [
    { label: first, st: firstDone ? 'done' : 'active' },
    { label: 'AI 분석 중', st: firstDone ? 'active' : 'wait' },
    { label: '결과 정리 중', st: 'wait' },
  ];
  const mark = { done: '✓', active: '●', wait: '○' } as const;

  return (
    <div className="gen-term" role="status" aria-live="polite">
      <div>
        <span className="ps">$</span> <span className="t">analyzing...</span> <span className="el">[{mmss(elapsed)}]</span>
      </div>
      <ol className="steps">
        {steps.map((s) => (
          <li key={s.label} className={s.st}>
            <span className="mk">{mark[s.st]}</span> {s.label}
          </li>
        ))}
      </ol>
      <div>&gt; {hint}</div>
      <div className="small"># 단계 표시는 경과 시간 기준이며 실제 진행률이 아닙니다.</div>
    </div>
  );
}
