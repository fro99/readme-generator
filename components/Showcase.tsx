'use client';
import { useEffect, useState, type ReactNode } from 'react';
import type { PortfolioGuide } from '@/lib/portfolio';
import PortfolioView from './PortfolioView';

// 연출용 고정 문구. 실제 API 호출은 하지 않는다.
const LINES = ['$ generate vercel/ms', 'analyzing...', '✓ README 생성 완료', '✓ 강점·개선점 · 이력서 3줄 · 면접 질문'];
const TYPE_FIRST_MS = 60; // 첫 줄(입력)은 사람이 치듯 천천히
const TYPE_REST_MS = 20; // 나머지(출력)는 빠르게
const PAUSE_MS = 450;

function renderLine(l: string) {
  if (l.startsWith('$ ')) return (<><span className="ps">$</span>{l.slice(1)}</>);
  if (l.startsWith('✓')) return (<><span className="ok">✓</span>{l.slice(1)}</>);
  return <span className="dim">{l}</span>;
}

// 터미널 데모: 마운트 시 한 번만 타이핑한다. prefers-reduced-motion이면 완성된 문구를 바로 보여준다.
export function TerminalDemo() {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setLines(LINES);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let li = 0;
    let ci = 0;
    const tick = () => {
      if (cancelled || li >= LINES.length) return;
      ci++;
      const line = li;
      const part = LINES[line].slice(0, ci);
      setLines((prev) => [...prev.slice(0, line), part]);
      if (ci >= LINES[line].length) {
        li++;
        ci = 0;
        timer = setTimeout(tick, PAUSE_MS);
      } else {
        timer = setTimeout(tick, line === 0 ? TYPE_FIRST_MS : TYPE_REST_MS);
      }
    };
    timer = setTimeout(tick, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="term" role="img" aria-label={`터미널 예시: ${LINES.join(', ')}`}>
      <div className="term-bar" aria-hidden="true">
        <span className="dot r" />
        <span className="dot y" />
        <span className="dot g" />
        <span className="term-title">~/repopilot</span>
      </div>
      <div className="term-body" aria-hidden="true">
        {lines.length === 0 ? (
          <div><span className="ps">$</span> <span className="cursor" /></div>
        ) : (
          lines.map((l, i) => (
            <div key={i}>
              {renderLine(l)}
              {i === lines.length - 1 && <span className="cursor" />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ───────────────────────── 샘플 결과 (고정 문구, AI 호출 없음) ─────────────────────────
// 근거: sindresorhus/is의 실제 파일 트리와 package.json (source/, test/, scripts: build·test, ES Modules, 런타임 의존성 없음).
// 점수·강점·개선점·질문은 결과 형식을 보여 주는 예시 문구이며 실제 진단 결과가 아니다.
const SAMPLE_REPO = 'sindresorhus/is';

const README_SAMPLE = [
  '# 🔍 @sindresorhus/is',
  '> 값의 타입을 검사하는 TypeScript 라이브러리',
  '',
  '## 📘 개요',
  '타입 검사, 타입 가드, 단언(assert)을 제공하는 npm 라이브러리입니다.',
  '',
  '## 🧱 기술 스택',
  '| 구분 | 기술 |',
  '| --- | --- |',
  '| 언어 | TypeScript (ES Modules) |',
  '| 검사·테스트 | xo, node --test |',
  '',
  '## 🛠️ 설치 및 실행',
  '```bash',
  'git clone https://github.com/sindresorhus/is.git && cd is',
  'npm install && npm test',
  '```',
  '',
  '## 📂 프로젝트 구조',
  '```',
  'source/  index.ts · types.ts · utilities.ts',
  'test/    test.ts · type-tests.ts',
  '```',
].join('\n');

const STRENGTHS = [
  'source/와 test/가 분리되어 있고 타입 정의(types.ts)와 유틸리티(utilities.ts)도 파일로 나뉘어 구조가 명확합니다.',
  '런타임 의존성 없이 ES Modules 패키지로 구성되어 가볍게 도입할 수 있습니다.',
  '일반 테스트와 별도로 타입 테스트(type-tests.ts)를 두어 타입 정의까지 검증합니다.',
];
const IMPROVEMENTS = [
  '사용 예시 코드를 단계별로 보여 주면 처음 쓰는 사람의 도입이 쉬워집니다.',
  '타입 검사 함수별 반환 타입을 표로 정리하면 원하는 함수를 찾기 쉽습니다.',
  '기여 방법과 이슈 규칙 섹션을 추가하면 협업 진입 장벽이 낮아집니다.',
];
const TODOS = ['데모(배포) 링크 추가', 'assets/ 폴더에 실행 화면 캡처 추가'];

const RESUME_ONE_LINER = 'TypeScript로 값의 타입 검사, 타입 가드, 단언을 제공하는 npm 라이브러리';
const RESUME_SUMMARY = [
  'source/와 test/를 분리하고 별도 타입 테스트(type-tests)로 타입 정의까지 검증하는 구조를 사용',
  '런타임 의존성 없이 ES Modules 패키지로 배포 가능한 라이브러리 구성',
  'build·test 스크립트로 빌드, 린트, 타입 검사, 테스트를 한 번에 실행',
];

const QUESTIONS = [
  '타입 가드 함수는 TypeScript의 타입 좁히기(narrowing)와 어떻게 연동되나요?',
  '런타임 검사와 컴파일 타임 타입 검사를 함께 제공할 때 설계상 어려웠던 점은 무엇인가요?',
  '의존성 없이 유지하기 위해 어떤 선택을 했고, 그 트레이드오프는 무엇인가요?',
  '일반 테스트 외에 타입 테스트(type-tests)를 따로 두는 이유는 무엇인가요?',
  '새 타입 검사 함수를 추가할 때 하위 호환성(breaking change)은 어떻게 관리하시겠습니까?',
];

// 결과 화면과 같은 스타일의 파일 패널(파일명 헤더 + 본문)
function SampleFile({ file, children }: { file: string; children: ReactNode }) {
  return (
    <div className="rpanel solo">
      <div className="rhead">
        <span className="fname">{file}</span>
      </div>
      {children}
    </div>
  );
}

function SampleReadme() {
  return (
    <SampleFile file="README.md">
      <pre className="code">{README_SAMPLE}</pre>
    </SampleFile>
  );
}

function SampleReview() {
  return (
    <SampleFile file="review.md">
      <div className="rbody">
        <p className="note"># 점수·강점·개선점은 결과 형식을 보여 주는 예시이며 실제 진단 결과가 아닙니다.</p>
        <div className="score" aria-label="점수 예시">
          <div className="score-row">
            <span className="k">rule</span>
            <div className="bar"><i style={{ width: `${Math.round((34 / 60) * 100)}%` }} /></div>
            <span className="v">34/60 (예시)</span>
          </div>
          <div className="score-sub">현재 <b>34</b> → 예상 <b>46</b> (예시, 생성된 README 적용 시, 60점 만점)</div>
          <div className="score-row">
            <span className="k">ai</span>
            <div className="bar"><i style={{ width: `${Math.round((31 / 40) * 100)}%` }} /></div>
            <span className="v">31/40 (예시)</span>
          </div>
          <div className="score-sub">문제 정의 <b>8</b>/10 · 구체성 <b>7</b>/10 · 구성 <b>8</b>/10 · 기술 선택 <b>8</b>/10</div>
          <div className="score-row total">
            <span className="k">total</span>
            <span />
            <span className="v">65/100 (예시)</span>
          </div>
        </div>
        <h4 className="sec">강점</h4>
        <ul className="list plus">{STRENGTHS.map((s, i) => <li key={i}>{s}</li>)}</ul>
        <h4 className="sec">개선점</h4>
        <ul className="list minus">{IMPROVEMENTS.map((s, i) => <li key={i}>{s}</li>)}</ul>
        <h4 className="sec">해야 할 일</h4>
        <ul className="list todo">{TODOS.map((s, i) => <li key={i}>{s}</li>)}</ul>
      </div>
    </SampleFile>
  );
}

function SampleResume() {
  return (
    <SampleFile file="resume.md">
      <div className="rbody">
        <p className="quote">{RESUME_ONE_LINER}</p>
        <ul className="list line">{RESUME_SUMMARY.map((s, i) => <li key={i}>{s}</li>)}</ul>
      </div>
    </SampleFile>
  );
}

function SampleQuestions() {
  return (
    <SampleFile file="interview.md">
      <div className="rbody">
        <ol className="qs">{QUESTIONS.map((q, i) => <li key={i}>{q}</li>)}</ol>
      </div>
    </SampleFile>
  );
}

// 포트폴리오 샘플: 확인된 사실(파일 구조, scripts, ES Modules)만 쓰고, 근거 없는 부분은 [확인 필요]로 표기. 역할·트러블슈팅·성과는 질문만.
const PORTFOLIO_SAMPLE: PortfolioGuide = {
  oneLiner: 'TypeScript로 값의 타입을 검사하고 타입 가드와 단언까지 제공하는 npm 라이브러리',
  background:
    '[확인 필요] 값의 타입을 런타임에 반복해서 확인하는 코드를 하나의 일관된 API로 묶어 줄이려는 목적으로 보입니다. 개발 배경은 직접 확인해 보강하세요.',
  features: [
    '값이 특정 타입인지 확인하는 검사 함수를 제공합니다.',
    '타입 가드로 검사 후 TypeScript 타입을 좁혀 줍니다.',
    '조건에 맞지 않으면 오류를 던지는 단언(assert) 함수를 제공합니다.',
    '별도 타입 테스트(type-tests)로 타입 정의까지 검증합니다.',
  ],
  tech: [
    { name: 'TypeScript', reason: '[확인 필요] 타입 가드처럼 검사 후 타입을 좁히는 기능을 정의하기에 적합합니다.' },
    { name: 'ES Modules', reason: 'package.json에서 type: module로 설정되어 있습니다.' },
    { name: 'xo · node --test', reason: 'test 스크립트에서 린트와 테스트를 함께 실행합니다.' },
  ],
  roleQuestions: [
    '이 프로젝트에서 직접 맡은 기능이나 모듈은 무엇인가요?',
    '기술이나 설계를 직접 결정한 부분이 있다면 무엇인가요?',
    '협업했다면 어떤 방식으로 역할을 나눴나요?',
  ],
  troubleshootingTopics: [
    '타입 가드의 타입 좁히기가 의도대로 동작하지 않았던 경험이 있나요?',
    '런타임 검사와 컴파일 타임 타입이 어긋났던 사례가 있나요?',
    '타입 테스트를 추가하게 된 계기가 된 버그가 있나요?',
  ],
  resultQuestions: [
    '이 라이브러리를 사용하는 프로젝트나 사용자는 몇 곳인가요?',
    '반복되던 검사 코드가 얼마나 줄었는지 수치로 말할 수 있나요?',
    '지원하는 검사 함수 수나 테스트 개수를 셀 수 있나요?',
  ],
  improvements: [
    'README에 사용 예시 코드를 단계별로 보여 주세요.',
    '각 검사 함수의 반환 타입을 표로 정리해 주세요.',
    '기여 방법과 이슈 규칙 섹션을 추가해 주세요.',
  ],
};

function SamplePortfolio() {
  return (
    <SampleFile file="portfolio.md">
      <PortfolioView guide={PORTFOLIO_SAMPLE} note="# 예시 문구이며 실제 생성 결과가 아닙니다. 실제로는 버튼을 눌렀을 때만 AI를 1회 호출합니다." />
    </SampleFile>
  );
}

const ITEMS: readonly { key: string; no: string; title: string; desc: string; body: ReactNode }[] = [
  { key: 'readme', no: '01', title: 'README', desc: '개요 · 기술 스택 · 설치 및 실행 · 프로젝트 구조까지 정해진 순서로 작성', body: <SampleReadme /> },
  { key: 'review', no: '02', title: '강점·개선점', desc: '규칙 60점 + AI 40점으로 진단하고 해야 할 일을 정리', body: <SampleReview /> },
  { key: 'resume', no: '03', title: '이력서 3줄', desc: '이력서에 붙일 한 줄 소개와 핵심 요약 3줄', body: <SampleResume /> },
  { key: 'questions', no: '04', title: '면접 질문', desc: '프로젝트 내용을 근거로 한 예상 질문 5개', body: <SampleQuestions /> },
  { key: 'portfolio', no: '05', title: '포트폴리오', desc: '포트폴리오에 프로젝트를 쓸 때 적어야 할 내용 정리 (내 역할·트러블슈팅은 직접 작성 안내)', body: <SamplePortfolio /> },
];

// 클릭하면 샘플 결과가 펼쳐지는 아코디언. 한 번에 하나만 열리고 기본은 모두 접힘.
export function SampleAccordion() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <section aria-labelledby="feat-title">
      <h2 className="sec" id="feat-title">만들어 주는 것</h2>
      <ul className="acc">
        {ITEMS.map((it) => {
          const isOpen = open === it.key;
          return (
            <li key={it.key} className={`acc-item${isOpen ? ' open' : ''}`}>
              <h3 className="acc-h">
                <button
                  type="button"
                  id={`acc-btn-${it.key}`}
                  className="acc-btn"
                  aria-expanded={isOpen}
                  aria-controls={`acc-panel-${it.key}`}
                  onClick={() => setOpen(isOpen ? null : it.key)}
                >
                  <span className="no">[{it.no}]</span>
                  <span>
                    <span className="acc-title">{it.title}</span>
                    <span className="acc-desc">{it.desc}</span>
                  </span>
                  <span className="acc-ind" aria-hidden="true">{isOpen ? '−' : '+'}</span>
                </button>
              </h3>
              {/* 접힌 패널은 inert로 키보드 포커스와 스크린리더 접근을 막는다 */}
              <div className="acc-panel" id={`acc-panel-${it.key}`} role="region" aria-labelledby={`acc-btn-${it.key}`} inert={!isOpen}>
                <div className="acc-inner">
                  <div className="acc-body">
                    <p className="sample-tag"># sample · {SAMPLE_REPO}</p>
                    {it.body}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
