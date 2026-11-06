// 결과 화면용 순수 유틸. 이미 받은 AI 응답(README 텍스트)을 가공할 뿐 AI나 네트워크를 쓰지 않는다.

const EMOJI = /[\p{Extended_Pictographic}️‍]/gu;

// README 첫 번째 H1에서 프로젝트 이름을 뽑는다 (이모지·마크다운 기호 제거)
export function readmeTitle(readme: string): string | null {
  const m = readme.match(/^\s*#\s+(.+)$/m);
  if (!m) return null;
  const t = m[1].replace(EMOJI, '').replace(/[*`_]/g, '').trim();
  return t || null;
}

const isSeparator = (l: string) => /^\|?\s*:?-{2,}/.test(l.trim());

// README의 "기술 스택" 섹션(표 또는 목록)에서 기술 이름을 뽑는다. 표가 없거나 형식이 다르면 빈 배열.
export function parseTechChips(readme: string): string[] {
  const lines = readme.replace(/\r\n?/g, '\n').split('\n');
  const start = lines.findIndex((l) => /^#{1,6}\s+.*(기술\s*스택|tech\s*stack|stack)/i.test(l));
  if (start < 0) return [];

  const raw: string[] = [];
  let sawTable = false;
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i].trim();
    if (/^#{1,6}\s/.test(l)) break;
    if (l.startsWith('|')) {
      sawTable = true;
      if (isSeparator(l)) continue;
      if (isSeparator(lines[i + 1] ?? '')) continue; // 구분선 바로 위 줄은 표 머리글
      const cells = l.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      if (cells.length >= 2) raw.push(cells[1]); // [구분 | 기술 | ...] 중 기술 칸
    } else if (!sawTable && /^[-*]\s+/.test(l)) {
      const item = l.replace(/^[-*]\s+/, '');
      raw.push(item.includes(':') ? item.split(':').slice(1).join(':') : item); // "언어: TypeScript" → TypeScript
    }
  }

  const out: string[] = [];
  for (const cell of raw) {
    const cleaned = cell.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*`]/g, '');
    for (const part of cleaned.split(/[,·、]|\s\/\s|\s\+\s/)) {
      const t = part.trim();
      if (!t || t.length > 28 || t.includes('여기에 작성')) continue;
      if (!out.some((x) => x.toLowerCase() === t.toLowerCase())) out.push(t);
    }
  }
  return out.slice(0, 8);
}
