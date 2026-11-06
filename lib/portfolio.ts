// 포트폴리오 가이드의 타입과 파서. 서버·클라이언트 공용(순수 코드).
// 파싱 방식은 /api/generate와 같다: 코드펜스·앞뒤 문장 제거 → 파싱 → 실패 시 문자열 안 제어문자 복구 후 재파싱.
import { describeSyntaxError, escapeControlCharsInStrings } from './diagnosis';

export type PortfolioGuide = {
  oneLiner: string; // 1. 프로젝트 한 줄 소개
  background: string; // 2. 개발 배경·문제 정의
  features: string[]; // 3. 주요 기능 (3~5개)
  tech: { name: string; reason: string }[]; // 4. 사용 기술과 선택 이유 (기술별 한 줄)
  roleQuestions: string[]; // 5. 내 역할: 직접 작성용 가이드 질문 3개 (AI가 역할을 쓰지 않음)
  troubleshootingTopics: string[]; // 6. 트러블슈팅: 후보 주제 3개(질문 형태). 해결 내용은 AI가 쓰지 않음
  resultQuestions: string[]; // 7. 성과·결과: 수치로 쓸 수 있는 항목 후보(질문 형태)
  improvements: string[]; // 8. 보완하면 좋은 점 3개
};

export type PortfolioMeta = { model: string; inputChars: number; outputChars: number; durationMs: number; attempts: number };
export type PortfolioResponse = { guide: PortfolioGuide; meta: PortfolioMeta };

export type PortfolioParseOutcome = { guide: PortfolioGuide | null; reason?: string; repaired?: boolean };

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const strs = (v: unknown, n: number) => (Array.isArray(v) ? v.map(str).filter(Boolean).slice(0, n) : []);

export function parsePortfolioDetailed(text: string): PortfolioParseOutcome {
  const t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const s = t.indexOf('{');
  const e = t.lastIndexOf('}');
  if (s < 0) return { guide: null, reason: 'no_json: { 없음' };
  if (e <= s) return { guide: null, reason: 'no_json: 닫는 } 없음 (잘림 의심)' };
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
      return { guide: null, reason: describeSyntaxError(err, candidate.length) };
    }
  }

  const tech = Array.isArray(o?.tech)
    ? o.tech
        .map((x: any) => ({ name: str(x?.name), reason: str(x?.reason) }))
        .filter((x: { name: string }) => x.name)
        .slice(0, 8)
    : [];
  const guide: PortfolioGuide = {
    oneLiner: str(o?.oneLiner),
    background: str(o?.background),
    features: strs(o?.features, 5),
    tech,
    roleQuestions: strs(o?.roleQuestions, 3),
    troubleshootingTopics: strs(o?.troubleshootingTopics, 3),
    resultQuestions: strs(o?.resultQuestions, 5),
    improvements: strs(o?.improvements, 3),
  };

  const missing = [
    !guide.oneLiner && 'oneLiner',
    !guide.background && 'background',
    !guide.features.length && 'features',
    !guide.tech.length && 'tech',
    !guide.roleQuestions.length && 'roleQuestions',
    !guide.troubleshootingTopics.length && 'troubleshootingTopics',
    !guide.resultQuestions.length && 'resultQuestions',
    !guide.improvements.length && 'improvements',
  ].filter(Boolean);
  if (missing.length) return { guide: null, reason: `validation:${missing.join(',')}`, repaired };
  return { guide, repaired };
}
