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

// 문자열 리터럴 "안에" 있는 실제 줄바꿈·탭 등 제어문자를 \n, \t 등으로 바꾼다. (문자열 밖의 공백·줄바꿈은 그대로 둠)
// 모델이 JSON 문자열 안에 줄바꿈을 이스케이프하지 않고 그대로 쓰면 JSON.parse가 실패하는 문제를 복구한다.
export function escapeControlCharsInStrings(s: string): string {
  let out = '';
  let inStr = false;
  let esc = false;
  for (const ch of s) {
    if (!inStr) {
      if (ch === '"') inStr = true;
      out += ch;
      continue;
    }
    if (esc) {
      out += ch;
      esc = false;
    } else if (ch === '\\') {
      out += ch;
      esc = true;
    } else if (ch === '"') {
      out += ch;
      inStr = false;
    } else if (ch === '\n') out += '\\n';
    else if (ch === '\r') out += '\\r';
    else if (ch === '\t') out += '\\t';
    else if (ch < ' ') out += `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`;
    else out += ch;
  }
  return out;
}

// 로그용 요약. JSON.parse 에러 메시지에는 입력 일부가 섞일 수 있어 종류와 위치(숫자)만 뽑는다.
export function describeSyntaxError(err: unknown, len: number): string {
  const msg = err instanceof Error ? err.message : '';
  const kind = /Unterminated string/i.test(msg)
    ? 'unterminated_string'
    : /Unexpected end/i.test(msg)
      ? 'unexpected_end'
      : /Bad control/i.test(msg)
        ? 'control_char'
        : /Unexpected token/i.test(msg)
          ? 'unexpected_token'
          : /Expected/i.test(msg)
            ? 'expected_token'
            : 'syntax';
  const pos = msg.match(/position (\d+)/)?.[1] ?? 'n/a';
  return `json_syntax:${kind} pos=${pos}/${len}`; // pos가 len 근처이고 kind가 unexpected_end/unterminated_string이면 잘림 의심
}

export type ParseOutcome = {
  report: AiReport | null;
  reason?: string; // 실패 사유(로그용, 입력 본문 없음)
  repaired?: boolean; // 줄바꿈·탭 복구 후에 성공했는지
};

// 모델 응답에서 JSON을 꺼내 검증한다. 코드펜스·앞뒤 문장 제거 → 파싱 → 실패 시 문자열 안 제어문자 복구 후 재파싱.
export function parseAiReportDetailed(text: string): ParseOutcome {
  const t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const s = t.indexOf('{');
  const e = t.lastIndexOf('}');
  if (s < 0) return { report: null, reason: 'no_json: { 없음' };
  if (e <= s) return { report: null, reason: 'no_json: 닫는 } 없음 (잘림 의심)' };
  const candidate = t.slice(s, e + 1);

  let o: any;
  let repaired = false;
  try {
    o = JSON.parse(candidate);
  } catch {
    try {
      o = JSON.parse(escapeControlCharsInStrings(candidate));
      repaired = true;
    } catch (err) {
      return { report: null, reason: describeSyntaxError(err, candidate.length) };
    }
  }

  const sc = o?.review?.scores;
  const scores = { problem: score(sc?.problem), detail: score(sc?.detail), structure: score(sc?.structure), techChoice: score(sc?.techChoice) };
  const readme = str(o?.readme);
  const strengths = strs(o?.review?.strengths, 3);
  const improvements = strs(o?.review?.improvements, 3);
  const oneLiner = str(o?.resume?.oneLiner);
  const summary = strs(o?.resume?.summary, 3);
  const questions = strs(o?.questions, 5);

  const missing = [
    !readme && 'readme',
    Object.values(scores).some((v) => v === null) && 'review.scores',
    !strengths.length && 'review.strengths',
    !improvements.length && 'review.improvements',
    !oneLiner && 'resume.oneLiner',
    !summary.length && 'resume.summary',
    !questions.length && 'questions',
  ].filter(Boolean);
  if (missing.length) return { report: null, reason: `validation:${missing.join(',')}`, repaired };

  return {
    report: {
      readme,
      review: { scores: scores as AiReview['scores'], strengths, improvements },
      resume: { oneLiner, summary },
      questions,
    },
    repaired,
  };
}

// 기존 호출부 호환용
export function parseAiReport(text: string): AiReport | null {
  return parseAiReportDetailed(text).report;
}
