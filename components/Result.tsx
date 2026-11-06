'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { aiTotal, AI_MAX, type AiReport, type DiagnosisResponse } from '@/lib/diagnosis';
import type { PortfolioGuide, PortfolioMeta } from '@/lib/portfolio';
import PortfolioView, { portfolioText } from './PortfolioView';
import SummaryCard from './SummaryCard';
import LoadingTerminal from './LoadingTerminal';
import { Bar, Gauge } from './Gauge';

type Tab = 'readme' | 'review' | 'resume' | 'questions' | 'portfolio';
// 포트폴리오 가이드 상태: 버튼을 눌렀을 때만 loading으로 바뀌고 AI를 1회 호출한다
type Pf =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; guide: PortfolioGuide; meta?: PortfolioMeta }
  | { status: 'error'; message: string };
const TABS: readonly { key: Tab; label: string; file: string }[] = [
  { key: 'readme', label: 'README', file: 'README.md' },
  { key: 'review', label: '강점·개선점', file: 'review.md' },
  { key: 'resume', label: '이력서 3줄', file: 'resume.md' },
  { key: 'questions', label: '면접 질문', file: 'interview.md' },
  { key: 'portfolio', label: '포트폴리오', file: 'portfolio.md' },
];
const AI_LABELS = { problem: '문제 정의', detail: '구체성', structure: '구성', techChoice: '기술 선택' } as const;
const AI_KEYS = Object.keys(AI_LABELS) as (keyof typeof AI_LABELS)[];

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

  // 포트폴리오 가이드: 기존 결과(README 정리본)만 보내므로 GitHub를 다시 읽지 않는다. 설명 직접 입력 결과(repo 없음)도 동작한다.
  const [pf, setPf] = useState<Pf>({ status: 'idle' });
  const [pfElapsed, setPfElapsed] = useState(0);
  const inflight = useRef(false); // state 갱신 전에 연타해도 중복 호출되지 않게 동기적으로 막는 잠금

  useEffect(() => {
    if (pf.status !== 'loading') return;
    const t = setInterval(() => setPfElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [pf.status]);

  async function generatePortfolio() {
    if (inflight.current || !ai) return;
    inflight.current = true;
    setPf({ status: 'loading' });
    setPfElapsed(0);
    try {
      const res = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: ai.readme.slice(0, 6000), oneLiner: ai.resume.oneLiner, repo: data.repo }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.guide) setPf({ status: 'error', message: json?.error ?? '포트폴리오 가이드를 받지 못했습니다.' });
      else setPf({ status: 'ok', guide: json.guide, meta: json.meta });
    } catch {
      setPf({ status: 'error', message: '네트워크 오류가 발생했습니다. 연결을 확인하고 다시 시도해 주세요.' });
    } finally {
      inflight.current = false;
    }
  }

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
  } else if (tab === 'portfolio') {
    copy = pf.status === 'ok' ? portfolioText(pf.guide, data.repo) : '';
    if (pf.status === 'ok') {
      body = <PortfolioView guide={pf.guide} />;
    } else if (!ai) {
      body = (
        <div className="rbody">
          <div className="gen-err" role="alert">
            <b>error:</b> AI 결과가 없어 포트폴리오 가이드를 만들 수 없습니다.
          </div>
        </div>
      );
    } else {
      body = (
        <div className="rbody pf-start">
          <p className="note">
            # 포트폴리오에 프로젝트를 쓸 때 적어야 할 내용을 정리합니다. 버튼을 누르면 AI를 1회 호출합니다(자동 실행 없음).
            내 역할·트러블슈팅·성과는 AI가 쓰지 않고, 직접 작성할 칸과 질문만 제공합니다.
          </p>
          {pf.status === 'error' && (
            <div className="gen-err" role="alert">
              <b>error:</b> {pf.message}
            </div>
          )}
          {pf.status === 'loading' && <LoadingTerminal elapsed={pfElapsed} first="README 정리본 준비" firstSeconds={0} hint="보통 10~20초 걸립니다." />}
          <button type="button" className="gen-run" onClick={generatePortfolio} disabled={pf.status === 'loading'} aria-label="포트폴리오 가이드 생성">
            {pf.status === 'loading' ? 'running...' : '$ 포트폴리오 가이드 생성'}
          </button>
        </div>
      );
    }
  } else {
    copy = reviewText(data);
    body = (
      <div className="rbody">
        <p className="note"># 참고용 진단입니다. 규칙 점검과 AI 평가로 만든 결과이며 실제 평가와 다를 수 있습니다.</p>

        {/* 점수: 상단. SVG 원형 게이지(숫자는 monospace) + AI 세부 점수 가로 막대 */}
        {(rule || ai) && (
          <div className="gauges" aria-label="점수">
            {rule && <Gauge value={rule.total} max={rule.max} label="rule" />}
            {ai && <Gauge value={aiTotal(ai.review)} max={AI_MAX} label="ai" />}
            {rule && ai && <Gauge value={rule.total + aiTotal(ai.review)} max={rule.max + AI_MAX} label="total" />}
          </div>
        )}
        {rule && (
          <p className="gauge-sub">
            rule 현재 <b>{rule.total}</b> → 예상 <b>{rule.expected}</b> (생성된 README 적용 시, {rule.max}점 만점)
          </p>
        )}
        {ai && (
          <ul className="subbars" aria-label="AI 세부 점수">
            {AI_KEYS.map((k) => (
              <li key={k}>
                <span>{AI_LABELS[k]}</span>
                <Bar value={ai.review.scores[k]} max={10} />
                <b>{ai.review.scores[k]}/10</b>
              </li>
            ))}
          </ul>
        )}
        {!rule && <p className="gauge-sub">설명 직접 입력 모드: 규칙 채점은 건너뛰고 AI 평가만 표시합니다.</p>}

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
      <SummaryCard data={data} />
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
