'use client';
import { useState, type ReactNode } from 'react';
import { aiTotal, AI_MAX, type AiReport, type DiagnosisResponse } from '@/lib/diagnosis';

type Tab = 'readme' | 'review' | 'resume' | 'questions';
const TABS: readonly { key: Tab; label: string; file: string }[] = [
  { key: 'readme', label: 'README', file: 'README.md' },
  { key: 'review', label: '강점·개선점', file: 'review.md' },
  { key: 'resume', label: '이력서 3줄', file: 'resume.md' },
  { key: 'questions', label: '면접 질문', file: 'interview.md' },
];
const AI_LABELS = { problem: '문제 정의', detail: '구체성', structure: '구성', techChoice: '기술 선택' } as const;
const AI_KEYS = Object.keys(AI_LABELS) as (keyof typeof AI_LABELS)[];
const pct = (v: number, max: number) => Math.max(0, Math.min(100, Math.round((v / max) * 100)));

// 복사 버튼: 누르면 2초 동안 "복사됨 ✓"
function CopyButton({ text, label }: { text: string; label: string }) {
  const [state, setState] = useState<'idle' | 'ok' | 'fail'>('idle');
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState('ok');
    } catch {
      setState('fail');
    }
    setTimeout(() => setState('idle'), 2000);
  }
  return (
    <button type="button" className={`copy${state === 'ok' ? ' done' : ''}`} onClick={copy} aria-label={`${label} 복사`}>
      {state === 'ok' ? '복사됨 ✓' : state === 'fail' ? '복사 실패' : '복사'}
    </button>
  );
}

// 파일 헤더(좌: 파일명, 우상단: 복사 버튼) + 본문
function Panel({ file, text, children }: { file: string; text: string; children: ReactNode }) {
  return (
    <div className="rpanel" role="tabpanel">
      <div className="rhead">
        <span className="fname">{file}</span>
        {text && <CopyButton text={text} label={file} />}
      </div>
      {children}
    </div>
  );
}

const resumeText = (ai: AiReport) => [ai.resume.oneLiner, '', ...ai.resume.summary.map((s) => `- ${s}`)].join('\n');
const questionsText = (ai: AiReport) => ai.questions.map((q, i) => `${i + 1}. ${q}`).join('\n');

function reviewText(d: DiagnosisResponse): string {
  const out: string[] = ['[참고용 진단]'];
  if (d.rule) {
    out.push(`규칙 점수 ${d.rule.total}/${d.rule.max} (현재) → ${d.rule.expected}/${d.rule.max} (예상)`);
    d.rule.items.forEach((i) => out.push(`${i.ok ? '✓' : '✗'} ${i.label} (${i.max}점)`));
  }
  if (d.ai) {
    out.push('', `AI 평가 ${aiTotal(d.ai.review)}/${AI_MAX}`);
    AI_KEYS.forEach((k) => out.push(`- ${AI_LABELS[k]}: ${d.ai!.review.scores[k]}/10`));
    out.push('', '강점', ...d.ai.review.strengths.map((s) => `- ${s}`), '', '개선점', ...d.ai.review.improvements.map((s) => `- ${s}`));
  }
  if (d.rule?.todos.length) out.push('', '해야 할 일', ...d.rule.todos.map((t) => `- [ ] ${t.label}`));
  return out.join('\n');
}

export default function Result({ data }: { data: DiagnosisResponse }) {
  const { rule, ai } = data;
  const [tab, setTab] = useState<Tab>(ai ? 'readme' : 'review'); // AI 실패 시 규칙 점수가 있는 탭부터
  const [done, setDone] = useState<Record<string, boolean>>({});
  const cur = TABS.find((t) => t.key === tab) ?? TABS[0];

  const aiError = (
    <div className="rbody">
      <div className="gen-err" role="alert">
        <b>error:</b> {data.aiError ?? 'AI 결과가 없습니다.'}
      </div>
    </div>
  );

  let body: ReactNode;
  let copy = '';

  if (tab === 'readme') {
    copy = ai?.readme ?? '';
    body = ai ? <pre className="code">{ai.readme}</pre> : aiError;
  } else if (tab === 'resume') {
    copy = ai ? resumeText(ai) : '';
    body = ai ? (
      <div className="rbody">
        <p className="quote">{ai.resume.oneLiner}</p>
        <ul className="list line">
          {ai.resume.summary.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </div>
    ) : (
      aiError
    );
  } else if (tab === 'questions') {
    copy = ai ? questionsText(ai) : '';
    body = ai ? (
      <div className="rbody">
        <ol className="qs">
          {ai.questions.map((q, i) => (
            <li key={i}>{q}</li>
          ))}
        </ol>
      </div>
    ) : (
      aiError
    );
  } else {
    copy = reviewText(data);
    body = (
      <div className="rbody">
        <p className="note"># 참고용 진단입니다. 규칙 점검과 AI 평가로 만든 결과이며 실제 평가와 다를 수 있습니다.</p>

        {/* 점수: 상단, monospace */}
        <div className="score" aria-label="점수">
          {rule && (
            <>
              <div className="score-row">
                <span className="k">rule</span>
                <div className="bar"><i style={{ width: `${pct(rule.total, rule.max)}%` }} /></div>
                <span className="v">{rule.total}/{rule.max}</span>
              </div>
              <div className="score-sub">
                현재 <b>{rule.total}</b> → 예상 <b>{rule.expected}</b> (생성된 README 적용 시, {rule.max}점 만점)
              </div>
            </>
          )}
          {ai && (
            <>
              <div className="score-row">
                <span className="k">ai</span>
                <div className="bar"><i style={{ width: `${pct(aiTotal(ai.review), AI_MAX)}%` }} /></div>
                <span className="v">{aiTotal(ai.review)}/{AI_MAX}</span>
              </div>
              <div className="score-sub">
                {AI_KEYS.map((k, i) => (
                  <span key={k}>
                    {i > 0 && ' · '}
                    {AI_LABELS[k]} <b>{ai.review.scores[k]}</b>/10
                  </span>
                ))}
              </div>
            </>
          )}
          {rule && ai && (
            <div className="score-row total">
              <span className="k">total</span>
              <span />
              <span className="v">{rule.total + aiTotal(ai.review)}/{rule.max + AI_MAX}</span>
            </div>
          )}
          {!rule && <div className="score-sub">설명 직접 입력 모드: 규칙 채점은 건너뛰고 AI 평가만 표시합니다.</div>}
        </div>

        {rule && (
          <>
            <h3 className="sec">규칙 점검</h3>
            <ul className="checks">
              {rule.items.map((i) => (
                <li key={i.key} className={i.ok ? 'ok' : 'no'}>
                  <span><span className="mark">{i.ok ? '✓' : '✗'}</span> {i.label}</span>
                  <span className="pt">{i.ok ? i.max : 0}/{i.max}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {ai ? (
          <>
            <h3 className="sec">강점</h3>
            <ul className="list plus">{ai.review.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
            <h3 className="sec">개선점</h3>
            <ul className="list minus">{ai.review.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </>
        ) : (
          <div style={{ marginTop: 16 }} className="gen-err" role="alert">
            <b>error:</b> {data.aiError ?? 'AI 결과가 없습니다.'}
          </div>
        )}

        {/* 해야 할 일: 같은 탭 하단 */}
        {rule && rule.todos.length > 0 && (
          <>
            <h3 className="sec">해야 할 일</h3>
            <ul className="todos">
              {rule.todos.map((t) => (
                <li key={t.key}>
                  <label>
                    <input type="checkbox" checked={!!done[t.key]} onChange={(e) => setDone({ ...done, [t.key]: e.target.checked })} />
                    <span>{t.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="res">
      <div className="etabs" role="tablist" aria-label="결과">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className="etab" onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      <Panel file={cur.file} text={copy}>
        {body}
      </Panel>
      {data.meta && (
        <p className="meta">
          {data.repo && `repo ${data.repo} · `}model {data.meta.model} · in {data.meta.inputChars} · out {data.meta.outputChars} ·{' '}
          {(data.meta.durationMs / 1000).toFixed(1)}s{data.meta.attempts > 1 && ' · retry 1'}
        </p>
      )}
    </div>
  );
}
