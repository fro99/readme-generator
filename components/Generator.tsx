'use client';
import { useState } from 'react';

type Meta = { model: string; inputChars: number; outputChars: number; durationMs: number };

export default function Generator() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [readme, setReadme] = useState('');
  const [meta, setMeta] = useState<Meta | null>(null);

  async function onGenerate() {
    // 서버와 같은 기준으로 먼저 검사해 불필요한 호출을 막음
    if (text.trim().length < 10) {
      setError('프로젝트 설명을 10자 이상 입력해 주세요.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? 'README 생성 중 오류가 발생했습니다.');
        return;
      }
      setReadme(data.readme);
      setMeta(data.meta);
    } catch {
      setError('네트워크 오류가 발생했습니다. 연결을 확인하고 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="gen">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="GitHub 저장소 링크나 프로젝트 설명을 입력하세요 (10자 이상)"
        rows={8}
        disabled={loading}
      />
      <button onClick={onGenerate} disabled={loading}>
        {loading ? '생성 중…' : 'README 생성'}
      </button>
      {error && (
        <p className="gen-error" role="alert">
          {error}
        </p>
      )}
      {readme && (
        <div className="gen-result">
          <pre>{readme}</pre>
          {meta && (
            <p className="gen-meta">
              모델 {meta.model} · 입력 {meta.inputChars}자 · 출력 {meta.outputChars}자 · {(meta.durationMs / 1000).toFixed(1)}초
            </p>
          )}
        </div>
      )}
    </section>
  );
}
