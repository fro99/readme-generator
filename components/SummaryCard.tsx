import { aiTotal, AI_MAX, type DiagnosisResponse } from '@/lib/diagnosis';
import { Bar } from './Gauge';
import { parseTechChips, readmeTitle } from './resultUtils';

// 결과 맨 위 요약 카드: 총점, 저장소(프로젝트) 이름, AI 소요 시간, 주요 기술 칩.
// 기술 칩은 AI 응답에 별도 필드가 없어서 README의 "기술 스택" 표에서 뽑는다(없으면 칩 줄을 숨김).
export default function SummaryCard({ data }: { data: DiagnosisResponse }) {
  const { rule, ai, meta } = data;

  let score: { k: string; value: number; max: number } | null = null;
  if (rule && ai) score = { k: 'total', value: rule.total + aiTotal(ai.review), max: rule.max + AI_MAX };
  else if (ai) score = { k: 'ai', value: aiTotal(ai.review), max: AI_MAX };
  else if (rule) score = { k: 'rule', value: rule.total, max: rule.max };

  const title = data.repo ?? (ai ? readmeTitle(ai.readme) : null) ?? '프로젝트';
  const chips = ai ? parseTechChips(ai.readme) : [];
  const metaLine = [
    data.mode === 'github' ? 'GitHub 저장소 분석' : '설명 입력 분석',
    meta ? `AI 소요 ${(meta.durationMs / 1000).toFixed(1)}s` : null,
    meta && meta.attempts > 1 ? '재시도 1회' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <section className="sum" aria-label="결과 요약">
      {score && (
        <div className="sum-score">
          <span className="k">{score.k}</span>
          <span className="n">
            {score.value}
            <small>/{score.max}</small>
          </span>
          <Bar value={score.value} max={score.max} />
        </div>
      )}
      <div className="sum-main">
        <p className="sum-title">{title}</p>
        <p className="sum-meta">{metaLine}</p>
        {chips.length > 0 && (
          <ul className="sum-chips" aria-label="주요 기술">
            {chips.map((c) => (
              <li key={c} className="tchip">
                {c}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
