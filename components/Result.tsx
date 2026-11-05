'use client';
import { useState } from 'react';
import { aiTotal, AI_MAX, type AiReport, type DiagnosisResponse } from '@/lib/diagnosis';

type Tab = 'diag' | 'readme' | 'resume' | 'questions';
const TABS: [Tab, string][] = [
  ['diag', '진단'],
  ['readme', 'README'],
  ['resume', '이력서 문구'],
  ['questions', '면접 질문'],
];
const AI_LABELS = { problem: '문제 정의', detail: '구체성', structure: '구성', techChoice: '기술 선택' } as const;

function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<'idle' | 'ok' | 'fail'>('idle');
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState('ok');
    } catch {
      setState('fail');
    }
    setTimeout(() => setState('idle'), 1500);
  }
  return (
    <button type="button" className="gen-copy" onClick={copy}>
      {state === 'ok' ? '복사됨 ✓' : state === 'fail' ? '복사 실패' : '복사'}
    </button>
  );
}

const resumeText = (ai: AiReport) => [ai.resume.oneLiner, '', ...ai.resume.summary.map((s) => `- ${s}`)].join('\n');
const questionsText = (ai: AiReport) => ai.questions.map((q, i) => `${i + 1}. ${q}`).join('\n');

function diagText(d: DiagnosisResponse): string {
  const out: string[] = ['[참고용 진단]'];
  if (d.rule) {
    out.push(`규칙 점수 ${d.rule.total}/${d.rule.max} (현재) → ${d.rule.expected}/${d.rule.max} (예상)`);
    d.rule.items.forEach((i) => out.push(`${i.ok ? '✓' : '✗'} ${i.label} (${i.max}점)`));
  }
  if (d.ai) {
    out.push('', `AI 평가 ${aiTotal(d.ai.review)}/${AI_MAX}`);
    (Object.keys(AI_LABELS) as (keyof typeof AI_LABELS)[]).forEach((k) => out.push(`- ${AI_LABELS[k]}: ${d.ai!.review.scores[k]}/10`));
    out.push('', '강점', ...d.ai.review.strengths.map((s) => `- ${s}`), '', '개선점', ...d.ai.review.improvements.map((s) => `- ${s}`));
  }
  if (d.rule?.todos.length) out.push('', '해야 할 일', ...d.rule.todos.map((t) => `- [ ] ${t.label}`));
  return out.join('\n');
}

export default function Result({ data }: { data: DiagnosisResponse }) {
  const [tab, setTab] = useState<Tab>('diag');
  const [done, setDone] = useState<Record<string, boolean>>({});
  const { rule, ai } = data;

  const noAi = <p className="gen-note">{data.aiError ?? 'AI 결과가 없습니다.'}</p>;
  const copyText = tab === 'diag' ? diagText(data) : ai ? (tab === 'readme' ? ai.readme : tab === 'resume' ? resumeText(ai) : questionsText(ai)) : '';

  return (
    <div className="gen-result">
      <div className="gen-tabs" role="tablist">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`gen-tab${tab === key ? ' active' : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
        {copyText && <CopyButton text={copyText} />}
      </div>

      {tab === 'diag' && (
        <div className="gen-diag">
          <p className="gen-note">⚠️ 참고용 진단입니다. 규칙 기반 점검과 AI 평가로 만든 결과이며 실제 평가 결과와 다를 수 있습니다.</p>

          {rule ? (
            <>
              <h3>
                규칙 점수 {rule.total} / {rule.max}
              </h3>
              <ul className="gen-items">
                {rule.items.map((i) => (
                  <li key={i.key} className={i.ok ? 'ok' : 'no'}>
                    <span className="mark">{i.ok ? '✓' : '✗'}</span> {i.label} <span className="pt">{i.ok ? i.max : 0}/{i.max}</span>
                  </li>
                ))}
              </ul>
              <p className="gen-delta">
                현재 <b>{rule.total}점</b> → 예상 <b>{rule.expected}점</b> <span className="gen-meta">(생성된 README를 적용했을 때, {rule.max}점 만점)</span>
              </p>
              {rule.todos.length > 0 && (
                <>
                  <h3>해야 할 일</h3>
                  <ul className="gen-todos">
                    {rule.todos.map((t) => (
                      <li key={t.key}>
                        <label>
                          <input type="checkbox" checked={!!done[t.key]} onChange={(e) => setDone({ ...done, [t.key]: e.target.checked })} /> {t.label}
                        </label>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          ) : (
            <p className="gen-note">설명 직접 입력 모드에서는 규칙 채점을 건너뛰고 AI 평가만 보여줍니다.</p>
          )}

          {ai ? (
            <>
              <h3>
                AI 평가 {aiTotal(ai.review)} / {AI_MAX}
              </h3>
              <ul className="gen-items">
                {(Object.keys(AI_LABELS) as (keyof typeof AI_LABELS)[]).map((k) => (
                  <li key={k}>
                    {AI_LABELS[k]} <span className="pt">{ai.review.scores[k]}/10</span>
                  </li>
                ))}
              </ul>
              <h3>강점</h3>
              <ul>{ai.review.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
              <h3>개선점</h3>
              <ul>{ai.review.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul>
              {rule && (
                <p className="gen-delta">
                  합계 <b>{rule.total + aiTotal(ai.review)}</b> / {rule.max + AI_MAX}
                </p>
              )}
            </>
          ) : (
            noAi
          )}
        </div>
      )}

      {tab === 'readme' && (ai ? <pre>{ai.readme}</pre> : noAi)}
      {tab === 'resume' &&
        (ai ? (
          <div className="gen-diag">
            <p><b>{ai.resume.oneLiner}</b></p>
            <ul>{ai.resume.summary.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </div>
        ) : (
          noAi
        ))}
      {tab === 'questions' && (ai ? <ol className="gen-diag">{ai.questions.map((q, i) => <li key={i}>{q}</li>)}</ol> : noAi)}

      {data.meta && (
        <p className="gen-meta">
          {data.repo && `저장소 ${data.repo} · `}모델 {data.meta.model} · 입력 {data.meta.inputChars}자 · 출력 {data.meta.outputChars}자 ·{' '}
          {(data.meta.durationMs / 1000).toFixed(1)}초{data.meta.attempts > 1 && ' · 재시도 1회'}
        </p>
      )}
    </div>
  );
}
