import type { PortfolioGuide } from '@/lib/portfolio';

// 직접 작성할 칸: monospace 주석 스타일로 눈에 띄게. AI가 내용을 채우지 않는다.
function TodoBox({ lead, lines, listLabel, items }: { lead: string; lines?: string[]; listLabel: string; items: string[] }) {
  return (
    <div className="todo-box">
      <p className="todo-tag"># TODO: 직접 작성</p>
      <p># {lead}</p>
      {lines && (
        <ul className="todo-lines">
          {lines.map((l) => (
            <li key={l}>{l} ________</li>
          ))}
        </ul>
      )}
      <p># {listLabel}</p>
      <ul className="todo-q">
        {items.map((q, i) => (
          <li key={i}>{q}</li>
        ))}
      </ul>
    </div>
  );
}

const TROUBLE_LINES = ['문제:', '원인:', '해결:', '배운 점:'];

// 포트폴리오 가이드 화면. 실제 결과(Result)와 샘플(Showcase)이 함께 쓴다.
export default function PortfolioView({ guide, note }: { guide: PortfolioGuide; note?: string }) {
  return (
    <div className="rbody">
      {note && <p className="note">{note}</p>}

      <h4 className="sec">1. 프로젝트 한 줄 소개</h4>
      <p className="quote">{guide.oneLiner}</p>

      <h4 className="sec">2. 개발 배경·문제 정의</h4>
      <p className="pf-text">{guide.background}</p>

      <h4 className="sec">3. 주요 기능</h4>
      <ul className="list plus">{guide.features.map((f, i) => <li key={i}>{f}</li>)}</ul>

      <h4 className="sec">4. 사용 기술과 선택 이유</h4>
      <ul className="pf-tech">
        {guide.tech.map((t, i) => (
          <li key={i}>
            <b>{t.name}</b>
            <span>{t.reason || '[확인 필요]'}</span>
          </li>
        ))}
      </ul>

      <h4 className="sec">5. 내 역할</h4>
      <TodoBox lead="내 역할은 AI가 대신 쓰지 않습니다. 아래 질문에 답하며 본인의 경험으로 채우세요." listLabel="작성 가이드 질문" items={guide.roleQuestions} />

      <h4 className="sec">6. 트러블슈팅</h4>
      <TodoBox
        lead="문제 → 원인 → 해결 → 배운 점 틀에 맞춰 직접 작성하세요. 겪지 않은 일은 쓰지 마세요."
        lines={TROUBLE_LINES}
        listLabel="후보 주제 (해당되는 것만 골라 쓰기)"
        items={guide.troubleshootingTopics}
      />

      <h4 className="sec">7. 성과·결과</h4>
      <TodoBox lead="실제로 확인한 수치만 쓰세요. 수치를 모르면 쓰지 않아도 됩니다." listLabel="수치로 쓸 수 있는 항목 후보" items={guide.resultQuestions} />

      <h4 className="sec">8. 보완하면 좋은 점</h4>
      <ul className="list minus">{guide.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul>
    </div>
  );
}

// 복사용 마크다운
export function portfolioText(guide: PortfolioGuide, repo?: string): string {
  const q = (items: string[]) => items.map((x) => `- ${x}`).join('\n');
  return [
    `# 포트폴리오 가이드${repo ? ` · ${repo}` : ''}`,
    '',
    '## 1. 프로젝트 한 줄 소개',
    guide.oneLiner,
    '',
    '## 2. 개발 배경·문제 정의',
    guide.background,
    '',
    '## 3. 주요 기능',
    q(guide.features),
    '',
    '## 4. 사용 기술과 선택 이유',
    guide.tech.map((t) => `- ${t.name}: ${t.reason || '[확인 필요]'}`).join('\n'),
    '',
    '## 5. 내 역할',
    '# TODO: 직접 작성 (AI가 대신 쓰지 않습니다)',
    '# 작성 가이드 질문',
    q(guide.roleQuestions),
    '',
    '## 6. 트러블슈팅',
    '# TODO: 직접 작성',
    ...TROUBLE_LINES.map((l) => `# ${l} ________`),
    '# 후보 주제',
    q(guide.troubleshootingTopics),
    '',
    '## 7. 성과·결과',
    '# TODO: 직접 작성 (실제로 확인한 수치만)',
    '# 수치로 쓸 수 있는 항목 후보',
    q(guide.resultQuestions),
    '',
    '## 8. 보완하면 좋은 점',
    q(guide.improvements),
  ].join('\n');
}
