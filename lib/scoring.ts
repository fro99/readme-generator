// 규칙 채점 (60점 만점). AI 호출 없음. 현재 저장소의 README를 평가한다.
// 서버·클라이언트 어디서든 import 가능하도록 순수 함수로만 구성.

export type ScoreItem = { key: string; label: string; max: number; ok: boolean };
export type ScoreTodo = { key: string; label: string };
export type ScoreResult = {
  items: ScoreItem[];
  total: number; // 현재 점수
  max: number; // 60
  expected: number; // 예상 점수 (생성된 README를 적용했을 때)
  todos: ScoreTodo[]; // 사람이 직접 해야 할 일
};

const DEFS = [
  { key: 'title', label: '프로젝트명 + 한 줄 소개', max: 6 },
  { key: 'overview', label: '개요', max: 8 },
  { key: 'stack', label: '기술 스택', max: 8 },
  { key: 'demo', label: '데모·배포 링크', max: 6 },
  { key: 'install', label: '설치 및 실행', max: 10 },
  { key: 'features', label: '주요 기능', max: 8 },
  { key: 'preview', label: '화면 미리보기', max: 8 },
  { key: 'structure', label: '디렉토리 구조', max: 6 },
] as const;

// 생성된 README가 채워 준다고 가정하는 항목. demo·preview는 사람이 해야 하므로 제외.
const AUTO_FIXED = new Set(['title', 'overview', 'stack', 'install', 'features', 'structure']);

const TODO_LABELS: Record<string, string> = {
  demo: '데모(배포) 링크 추가 — 배포 주소를 README와 저장소 Website 필드에 기재',
  preview: 'assets/ 폴더에 실행 화면 캡처 추가 — README 화면 미리보기 표에 이미지 연결',
};

// ───────── 헤더 키워드 (정규화된 텍스트 기준: 소문자, 이모지·기호 제거) ─────────
const RE_OVERVIEW = /개요|프로젝트 소개|서비스 소개|프로젝트 설명|소개|overview|about|introduction|description/;
const RE_NOT_OVERVIEW = /팀|team|member|contributor|author|제작자|만든 사람/;
const RE_STACK = /기술 ?스택|스택|사용 ?기술|사용된 기술|개발 환경|tech ?stack|stack|technolog|built with|tools? used/;
const RE_INSTALL = /설치|실행|시작하기|getting started|install|setup|set up|quick ?start|how to run|run locally/;
const RE_FEATURES = /기능|features?|what it does|capabilit/;
const RE_STRUCTURE = /디렉[토터]리|폴더|프로젝트 구조|파일 구조|구조|directory|folder|structure|layout|file tree/;
const RE_DEMO_WORD = /demo|데모|배포|deploy|\blive\b|라이브|website|웹사이트|바로가기/i;

// 데모 링크로 보기 어려운 호스트(저장소 자체, 배지)
const RE_NOT_DEMO_URL = /(^|\.)github\.com|shields\.io|badgen|codecov|travis-ci|img\.|badge/i;
const RE_NOT_PREVIEW_IMG = /shields\.io|badgen|badge|codecov|travis-ci|\/workflows\//i;

const norm = (s: string) =>
  s
    .replace(/[\p{Extended_Pictographic}️‍]/gu, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

type Heading = { level: number; text: string; line: number };
type Parsed = { lines: string[]; headings: Heading[]; inCode: boolean[]; isFence: boolean[] };

function parse(readme: string): Parsed {
  const lines = readme.replace(/\r\n?/g, '\n').split('\n');
  const headings: Heading[] = [];
  const inCode: boolean[] = [];
  const isFence: boolean[] = [];
  let fence = '';
  lines.forEach((ln, i) => {
    const f = ln.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (f) {
      isFence[i] = true;
      inCode[i] = true;
      if (!fence) fence = f[1][0];
      else if (f[1][0] === fence) fence = '';
      return;
    }
    isFence[i] = false;
    inCode[i] = !!fence;
    if (fence) return;
    const md = ln.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    const html = ln.match(/^\s*<h([1-6])[^>]*>(.*?)<\/h\1>/i);
    if (md) headings.push({ level: md[1].length, text: norm(md[2]), line: i });
    else if (html) headings.push({ level: Number(html[1]), text: norm(html[2].replace(/<[^>]+>/g, ' ')), line: i });
  });
  return { lines, headings, inCode, isFence };
}

// 헤더 아래 섹션의 줄 범위 [시작, 끝): 같거나 더 높은 레벨의 다음 헤더 전까지
function sectionEnd(p: Parsed, h: Heading): number {
  const next = p.headings.find((x) => x.line > h.line && x.level <= h.level);
  return next ? next.line : p.lines.length;
}

function hasHeading(p: Parsed, re: RegExp, exclude?: RegExp): Heading[] {
  return p.headings.filter((h) => re.test(h.text) && !(exclude && exclude.test(h.text)));
}

function checkTitle(p: Parsed): boolean {
  const h1 = p.headings.find((h) => h.level === 1);
  if (!h1) return false;
  for (let i = h1.line + 1; i < p.lines.length; i++) {
    if (!p.lines[i].trim()) continue;
    return p.lines[i].trim().startsWith('>'); // 바로 아래 첫 줄이 인용문이어야 함
  }
  return false;
}

function urlsIn(text: string): string[] {
  return (text.match(/https?:\/\/[^\s)>\]"'<]+/g) ?? []).filter((u) => {
    try {
      return !RE_NOT_DEMO_URL.test(new URL(u).hostname);
    } catch {
      return false;
    }
  });
}

function checkDemo(p: Parsed, homepage: string | null): boolean {
  if (homepage && /^https?:\/\/\S+$/i.test(homepage.trim())) return true;
  // 같은 줄에 키워드와 URL이 함께 있는 경우 (코드블록 제외)
  if (p.lines.some((ln, i) => !p.inCode[i] && RE_DEMO_WORD.test(ln) && urlsIn(ln).length > 0)) return true;
  // 데모·배포 헤더 섹션 안에 URL이 있는 경우
  return p.headings.some((h) => {
    if (!RE_DEMO_WORD.test(h.text)) return false;
    const body = p.lines.slice(h.line + 1, sectionEnd(p, h)).filter((_, k) => !p.inCode[h.line + 1 + k]);
    return urlsIn(body.join('\n')).length > 0;
  });
}

function checkInstall(p: Parsed): boolean {
  // 헤더 + 그 섹션 안의 코드블록
  return hasHeading(p, RE_INSTALL).some((h) => {
    const end = sectionEnd(p, h);
    for (let i = h.line + 1; i < end; i++) if (p.isFence[i]) return true;
    return false;
  });
}

function checkPreview(p: Parsed): boolean {
  return p.lines.some((ln, i) => {
    if (p.inCode[i]) return false;
    const found = [...ln.matchAll(/!\[[^\]]*\]\(\s*<?([^)\s>]+)/g)].map((m) => m[1]);
    found.push(...[...ln.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)].map((m) => m[1]));
    return found.some((src) => !RE_NOT_PREVIEW_IMG.test(src));
  });
}

export function scoreReadme({ readme, homepage }: { readme: string | null; homepage: string | null }): ScoreResult {
  const p = parse(readme ?? '');
  const oks: Record<string, boolean> = readme
    ? {
        title: checkTitle(p),
        overview: hasHeading(p, RE_OVERVIEW, RE_NOT_OVERVIEW).length > 0,
        stack: hasHeading(p, RE_STACK).length > 0,
        demo: checkDemo(p, homepage),
        install: checkInstall(p),
        features: hasHeading(p, RE_FEATURES).length > 0,
        preview: checkPreview(p),
        structure: hasHeading(p, RE_STRUCTURE).length > 0,
      }
    : { demo: checkDemo(p, homepage) }; // README가 없어도 homepage 필드는 인정

  const items: ScoreItem[] = DEFS.map((d) => ({ ...d, ok: !!oks[d.key] }));
  const total = items.reduce((s, i) => s + (i.ok ? i.max : 0), 0);
  const expected = items.reduce((s, i) => s + (i.ok || AUTO_FIXED.has(i.key) ? i.max : 0), 0);
  const todos = items.filter((i) => !i.ok && !AUTO_FIXED.has(i.key)).map((i) => ({ key: i.key, label: TODO_LABELS[i.key] }));
  return { items, total, max: items.reduce((s, i) => s + i.max, 0), expected, todos };
}
