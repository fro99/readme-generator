// AI 결과(JSON)의 타입과 파서, API 응답 타입. 서버·클라이언트 공용(순수 코드).
import type { ScoreResult } from './scoring';

export type AiReview = {
  scores: { problem: number; detail: number; structure: number; techChoice: number }; // 각 0~10
  strengths: string[];
  improvements: string[];
};

export type AiReport = {
  readme: string;
  review: AiReview;
  resume: { oneLiner: string; summary: string[] };
  questions: string[];
};

export type DiagnosisResponse = {
  mode: 'github' | 'text';
  repo?: string;
  rule: ScoreResult | null; // 설명 직접 입력 모드에서는 null
  ai: AiReport | null; // AI 평가가 실패하면 null
  aiError?: string;
  meta?: { model: string; inputChars: number; outputChars: number; durationMs: number; attempts: number };
};

export const AI_MAX = 40;
export const aiTotal = (r: AiReview) => r.scores.problem + r.scores.detail + r.scores.structure + r.scores.techChoice;

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const strs = (v: unknown, n: number) => (Array.isArray(v) ? v.map(str).filter(Boolean).slice(0, n) : []);
const score = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(10, Math.max(0, Math.round(v))) : null);

// 모델 응답에서 JSON을 꺼내 검증한다. 형식이 맞지 않으면 null.
export function parseAiReport(text: string): AiReport | null {
  const t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const s = t.indexOf('{');
  const e = t.lastIndexOf('}');
  if (s < 0 || e <= s) return null;
  let o: any;
  try {
    o = JSON.parse(t.slice(s, e + 1));
  } catch {
    return null;
  }
  const sc = o?.review?.scores;
  const scores = { problem: score(sc?.problem), detail: score(sc?.detail), structure: score(sc?.structure), techChoice: score(sc?.techChoice) };
  const readme = str(o?.readme);
  const strengths = strs(o?.review?.strengths, 3);
  const improvements = strs(o?.review?.improvements, 3);
  const oneLiner = str(o?.resume?.oneLiner);
  const summary = strs(o?.resume?.summary, 3);
  const questions = strs(o?.questions, 5);
  if (!readme || !oneLiner || !strengths.length || !improvements.length || !summary.length || !questions.length) return null;
  if (Object.values(scores).some((v) => v === null)) return null;
  return {
    readme,
    review: { scores: scores as AiReview['scores'], strengths, improvements },
    resume: { oneLiner, summary },
    questions,
  };
}
