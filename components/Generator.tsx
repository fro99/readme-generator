'use client';
import { useState } from 'react';
import Result from './Result';
import type { DiagnosisResponse } from '@/lib/diagnosis';

type Mode = 'github' | 'text';

export default function Generator() {
  const [mode, setMode] = useState<Mode>('github');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<DiagnosisResponse | null>(null);

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
    } catch {
      setError('네트워크 오류가 발생했습니다. 연결을 확인하고 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="gen">
      <div className="gen-tabs" role="tablist">
        {([['github', 'GitHub 링크'], ['text', '설명 직접 입력']] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={mode === key}
            className={`gen-tab${mode === key ? ' active' : ''}`}
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
      {mode === 'github' ? (
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/owner/repo (공개 저장소)"
          disabled={loading}
        />
      ) : (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="프로젝트 설명을 입력하세요 (10자 이상)"
          rows={8}
          disabled={loading}
        />
      )}
      <button onClick={onGenerate} disabled={loading}>
        {loading ? '생성 중…' : 'README 생성'}
      </button>
      {error && (
        <p className="gen-error" role="alert">
          {error}
        </p>
      )}
      {result && <Result data={result} />}
    </section>
  );
}
