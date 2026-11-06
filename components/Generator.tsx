'use client';
import { useEffect, useState } from 'react';
import Result from './Result';
import { SampleAccordion, TerminalDemo } from './Showcase';
import LoadingTerminal from './LoadingTerminal';
import type { DiagnosisResponse } from '@/lib/diagnosis';

type Mode = 'github' | 'text';
const MODES = [['github', 'GitHub 링크'], ['text', '설명 직접 입력']] as const;

export default function Generator() {
  const [mode, setMode] = useState<Mode>('github');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<DiagnosisResponse | null>(null);
  const [runId, setRunId] = useState(0); // 새 결과마다 Result를 새로 마운트(탭·체크 상태 초기화)
  const [elapsed, setElapsed] = useState(0); // 로딩 중 경과 초

  useEffect(() => {
    if (!loading) return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [loading]);

  async function onGenerate() {
    // 서버와 같은 기준으로 먼저 검사해 불필요한 호출을 막음
    if (mode === 'github' && !url.trim()) {
      setError('GitHub 저장소 주소를 입력해 주세요.');
      return;
    }
    if (mode === 'text' && text.trim().length < 10) {
      setError('프로젝트 설명을 10자 이상 입력해 주세요.');
      return;
    }
    setLoading(true);
    setElapsed(0);
    setError('');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, text: mode === 'github' ? url : text }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? 'README 생성 중 오류가 발생했습니다.');
        return;
      }
      setResult(data);
      setRunId((n) => n + 1);
    } catch {
      setError('네트워크 오류가 발생했습니다. 연결을 확인하고 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="gen">
      <div className="etabs" role="tablist" aria-label="입력 방식">
        {MODES.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={mode === key}
            className="etab"
            onClick={() => {
              setMode(key);
              setError('');
            }}
            disabled={loading}
          >
            {label}
          </button>
        ))}
      </div>

      <form
        className="gen-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!loading) onGenerate();
        }}
      >
        <div className={`gen-row${mode === 'text' ? ' stack' : ''}`}>
          <div className="gen-field">
            <span className="gen-ps" aria-hidden="true">$</span>
            {mode === 'github' ? (
              <input
                type="text"
                inputMode="url"
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                aria-label="GitHub 저장소 주소"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="github.com/owner/repo (공개 저장소)"
                disabled={loading}
              />
            ) : (
              <textarea
                aria-label="프로젝트 설명"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="프로젝트 설명을 입력하세요 (10자 이상)"
                rows={6}
                disabled={loading}
              />
            )}
          </div>
          <button type="submit" className="gen-run" disabled={loading} aria-label="README 생성">
            {loading ? 'running...' : '$ generate'}
          </button>
        </div>
      </form>

      {loading && (
        <LoadingTerminal
          elapsed={elapsed}
          first={mode === 'github' ? '저장소 읽는 중' : '입력 확인'}
          firstSeconds={mode === 'github' ? 3 : 0}
          hint="보통 15~20초 걸립니다."
        />
      )}
      {error && !loading && (
        <div className="gen-err" role="alert">
          <b>error:</b> {error}
        </div>
      )}
      {result && !loading && <Result key={runId} data={result} />}

      {/* 데모는 마운트 상태를 유지한 채 숨겨서 타이핑이 1회만 실행되게 함. 결과가 나오면 기능 카드는 결과 아래에 위치 */}
      <div hidden={loading || !!result}>
        <TerminalDemo />
      </div>
      <SampleAccordion />
    </section>
  );
}
