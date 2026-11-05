import 'server-only'; // GITHUB_TOKEN이 브라우저로 노출되지 않도록 서버 전용

// ───────── 타입 ─────────
export type RepoFile = {
  path: string;
  kind: 'readme' | 'deps' | 'source';
  content: string; // 상한 적용 후 텍스트
  truncated: boolean; // 앞부분만 잘라 담았는지
};

export type RepoInfo = {
  owner: string;
  name: string;
  fullName: string;
  url: string;
  description: string | null;
  language: string | null;
  homepage: string | null;
  topics: string[];
  defaultBranch: string;
  tree: string[]; // 깊이 2까지의 경로 (폴더는 '/'로 끝남)
  files: RepoFile[]; // README → 의존성 파일 → 핵심 소스 순
  readme: string | null; // 현재 README 전문 (규칙 채점용, 글자 수 상한 없음. 200KB 초과면 null)
};

// 사용자에게 그대로 보여줘도 되는 한국어 메시지를 가진 에러
export class GithubError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'GithubError';
    this.status = status;
  }
}

// ───────── 상한 ─────────
export const MAX_FILE_CHARS = 3000; // 파일당 절대 상한
export const MAX_TOTAL_CHARS = 12000; // 전체 텍스트 절대 상한
const README_CHARS = 2000;
const DEPS_CHARS = 1000;
const SOURCE_CHARS = 2000;
const TREE_CHARS = 1500;
const MAX_DEPS_FILES = 2;
const MAX_SOURCE_FILES = 5;
const MAX_BLOB_BYTES = 200_000; // 이보다 큰 파일은 읽지 않음
const TIMEOUT_MS = 10_000;

// ───────── 제외 규칙 ─────────
const IGNORED_DIRS = new Set([
  'node_modules', '.git', '.next', '.nuxt', '.svelte-kit', 'dist', 'build', 'out', 'target', 'vendor',
  '__pycache__', '.venv', 'venv', 'env', 'coverage', '.idea', '.vscode', '.gradle', 'Pods',
]);
const BINARY_EXT = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'webp', 'bmp', 'avif', 'tiff', 'psd',
  'pdf', 'zip', 'gz', 'tar', 'tgz', '7z', 'rar', 'jar', 'war', 'exe', 'dll', 'so', 'dylib', 'bin', 'class', 'o', 'a',
  'woff', 'woff2', 'ttf', 'otf', 'eot', 'mp3', 'mp4', 'mov', 'avi', 'wav', 'webm', 'pyc', 'map', 'wasm',
]);
const LOCK_NAMES = new Set(['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'npm-shrinkwrap.json', 'bun.lockb', 'go.sum']);

function ext(path: string): string {
  const file = path.split('/').pop() ?? '';
  const i = file.lastIndexOf('.');
  return i < 0 ? '' : file.slice(i + 1).toLowerCase();
}

function isExcluded(path: string, type: string): boolean {
  const parts = path.split('/');
  if (parts.slice(0, type === 'tree' ? parts.length : -1).some((p) => IGNORED_DIRS.has(p))) return true;
  if (type === 'tree') return false;
  const file = parts[parts.length - 1];
  return BINARY_EXT.has(ext(path)) || LOCK_NAMES.has(file) || file.endsWith('.lock') || file.endsWith('.min.js');
}

// ───────── URL 파싱 ─────────
export function parseRepoUrl(input: string): { owner: string; repo: string } {
  const bad = () => new GithubError('올바른 GitHub 저장소 주소가 아닙니다. 예: https://github.com/vercel/next.js', 400);
  let s = input.trim();
  if (!s || /\s/.test(s)) throw bad();
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    throw bad();
  }
  if (u.hostname.toLowerCase() !== 'github.com' && u.hostname.toLowerCase() !== 'www.github.com') throw bad();
  const [owner, rawRepo] = u.pathname.split('/').filter(Boolean);
  const repo = rawRepo?.replace(/\.git$/i, '');
  const valid = (v?: string): v is string => !!v && /^[A-Za-z0-9_.-]+$/.test(v) && v !== '.' && v !== '..';
  if (!valid(owner) || !valid(repo)) throw bad();
  return { owner, repo };
}

// ───────── GitHub 호출 ─────────
const PRIVATE_MSG = '비공개 저장소는 읽을 수 없습니다. 공개 저장소 주소를 입력해 주세요.';

async function ghFetch(path: string): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'readme-generator',
  };
  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) headers.Authorization = `Bearer ${token}`; // 없으면 인증 없이 호출
  try {
    return await fetch(`https://api.github.com${path}`, { headers, signal: AbortSignal.timeout(TIMEOUT_MS), cache: 'no-store' });
  } catch {
    throw new GithubError('GitHub에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.', 502);
  }
}

function httpError(res: Response): GithubError {
  const rateLimited =
    res.status === 429 || (res.status === 403 && (res.headers.get('x-ratelimit-remaining') === '0' || res.headers.has('retry-after')));
  if (rateLimited) return new GithubError('GitHub API 요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.', 429);
  if (res.status === 404) return new GithubError('저장소를 찾을 수 없습니다. 주소를 확인해 주세요. (비공개 저장소는 읽을 수 없습니다.)', 404);
  if (res.status === 403) return new GithubError(PRIVATE_MSG, 403);
  if (res.status === 401) return new GithubError('서버의 GitHub 인증 설정에 문제가 있습니다. 관리자에게 문의해 주세요.', 500);
  return new GithubError(`GitHub 응답 오류(${res.status})가 발생했습니다. 잠시 후 다시 시도해 주세요.`, 502);
}

async function ghJson<T>(path: string): Promise<T> {
  const res = await ghFetch(path);
  if (!res.ok) throw httpError(res);
  return (await res.json()) as T;
}

type GhRepo = {
  name: string;
  owner: { login: string };
  private: boolean;
  description: string | null;
  language: string | null;
  homepage: string | null;
  topics?: string[];
  default_branch: string;
  html_url: string;
};
type GhTreeEntry = { path: string; type: 'blob' | 'tree' | 'commit'; size?: number };

async function fetchTree(owner: string, repo: string, branch: string): Promise<GhTreeEntry[]> {
  const res = await ghFetch(`/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`);
  if (res.status === 409) return []; // 비어 있는 저장소
  if (!res.ok) throw httpError(res);
  const data = (await res.json()) as { tree?: GhTreeEntry[] };
  return data.tree ?? [];
}

// 파일 내용은 raw.githubusercontent.com에서 읽음 (API 호출 한도를 아끼고 토큰도 보내지 않음)
async function fetchRaw(owner: string, repo: string, branch: string, path: string): Promise<string | null> {
  const enc = (p: string) => p.split('/').map(encodeURIComponent).join('/');
  try {
    const res = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${enc(branch)}/${enc(path)}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.includes('\0') ? null : text; // 바이너리는 제외
  } catch {
    return null;
  }
}

// ───────── 파일 선택 ─────────
const DEPS_NAMES = new Set([
  'package.json', 'requirements.txt', 'pyproject.toml', 'Pipfile', 'setup.py', 'go.mod', 'Cargo.toml',
  'pom.xml', 'build.gradle', 'build.gradle.kts', 'Gemfile', 'composer.json', 'pubspec.yaml',
]);
const SOURCE_EXT = new Set([
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'py', 'go', 'rs', 'java', 'kt', 'rb', 'php', 'cs', 'swift', 'vue', 'svelte', 'dart', 'c', 'cpp',
]);
const ENTRY_NAMES = new Set(['main', 'index', 'app', 'server', 'cli', '__main__', 'page', 'route', 'handler', 'api', 'program']);
const SKIP_DIRS = /^(tests?|__tests__|spec|e2e|examples?|docs?|scripts?|migrations?|fixtures?|mocks?|\.github)$/i;

function sourceScore(path: string, size: number): number {
  const parts = path.split('/');
  const file = parts[parts.length - 1];
  const base = file.replace(/\.[^.]+$/, '').toLowerCase();
  if (!SOURCE_EXT.has(ext(path)) || file.endsWith('.d.ts') || /\.config\./i.test(file)) return -Infinity;
  if (parts.slice(0, -1).some((p) => SKIP_DIRS.test(p)) || /(^|[._-])(test|tests|spec)([._-]|$)/.test(base)) return -Infinity;
  let score = 0;
  if (ENTRY_NAMES.has(base)) score += 10;
  if (/^(src|app|lib|cmd|pkg)$/.test(parts[0]) && parts.length > 1) score += 3;
  score -= (parts.length - 1) * 2; // 얕은 경로 우선
  if (size < 150) score -= 5; // 거의 빈 파일은 후순위
  return score;
}

// ───────── 포맷 ─────────
const KIND_LABEL = { readme: 'README', deps: '의존성 파일', source: '소스 파일' } as const;

function fileSection(f: RepoFile): string {
  return `\n\n[${KIND_LABEL[f.kind]}: ${f.path}${f.truncated ? ' — 앞부분만 발췌' : ''}]\n${f.content}`;
}

// AI 프롬프트의 <project> 안에 넣을 텍스트. 항상 MAX_TOTAL_CHARS 이하.
export function formatRepoInfo(info: RepoInfo): string {
  const head = [
    `GitHub 저장소: ${info.fullName}`,
    `URL: ${info.url}`,
    `설명: ${info.description || '(없음)'}`,
    `주요 언어: ${info.language || '(알 수 없음)'}`,
    `홈페이지: ${info.homepage || '(없음)'}`,
    `토픽: ${info.topics.length ? info.topics.join(', ') : '(없음)'}`,
    '',
    '[파일 트리 (깊이 2)]',
    info.tree.length ? info.tree.join('\n') : '(읽지 못했거나 비어 있음)',
  ].join('\n');
  return (head + info.files.map(fileSection).join('')).slice(0, MAX_TOTAL_CHARS);
}

// ───────── 메인 ─────────
export async function fetchRepoInfo(url: string): Promise<RepoInfo> {
  const { owner, repo } = parseRepoUrl(url);
  const meta = await ghJson<GhRepo>(`/repos/${owner}/${repo}`);
  if (meta.private) throw new GithubError(PRIVATE_MSG, 403); // 토큰이 접근 가능한 비공개 저장소도 차단
  const branch = meta.default_branch;

  const entries = (await fetchTree(meta.owner.login, meta.name, branch)).filter(
    (e) => e.type !== 'commit' && !isExcluded(e.path, e.type),
  );
  const blobs = entries.filter((e) => e.type === 'blob' && (e.size ?? 0) <= MAX_BLOB_BYTES);

  // 파일 트리 (깊이 2, 글자 수 상한)
  const tree: string[] = [];
  let treeLen = 0;
  for (const e of entries) {
    if (e.path.split('/').length > 2) continue;
    const line = e.type === 'tree' ? `${e.path}/` : e.path;
    if (treeLen + line.length + 1 > TREE_CHARS) {
      tree.push('…');
      break;
    }
    tree.push(line);
    treeLen += line.length + 1;
  }

  // 읽을 후보: README → 의존성 → 소스 (이 순서가 예산 우선순위)
  type Candidate = { path: string; kind: RepoFile['kind']; cap: number };
  const candidates: Candidate[] = [];
  const readme = blobs
    .filter((e) => /^readme(\.[a-z]+)?$/i.test(e.path))
    .sort((a, b) => Number(!/\.md$/i.test(a.path)) - Number(!/\.md$/i.test(b.path)))[0];
  if (readme) candidates.push({ path: readme.path, kind: 'readme', cap: README_CHARS });
  blobs
    .filter((e) => e.path.split('/').length <= 2 && DEPS_NAMES.has(e.path.split('/').pop() ?? ''))
    .sort((a, b) => a.path.split('/').length - b.path.split('/').length)
    .slice(0, MAX_DEPS_FILES)
    .forEach((e) => candidates.push({ path: e.path, kind: 'deps', cap: DEPS_CHARS }));
  blobs
    .map((e) => ({ path: e.path, score: sourceScore(e.path, e.size ?? 0) }))
    .filter((e) => e.score > -Infinity)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SOURCE_FILES)
    .forEach((e) => candidates.push({ path: e.path, kind: 'source', cap: SOURCE_CHARS }));

  const raws = await Promise.all(candidates.map((c) => fetchRaw(meta.owner.login, meta.name, branch, c.path)));

  const readmeIdx = candidates.findIndex((c) => c.kind === 'readme');
  const info: RepoInfo = {
    owner: meta.owner.login,
    name: meta.name,
    fullName: `${meta.owner.login}/${meta.name}`,
    url: meta.html_url,
    description: meta.description?.slice(0, 500) ?? null,
    language: meta.language,
    homepage: meta.homepage?.slice(0, 200) || null,
    topics: (meta.topics ?? []).slice(0, 20),
    defaultBranch: branch,
    tree,
    files: [],
    readme: readmeIdx >= 0 ? (raws[readmeIdx] ?? null) : null,
  };

  // 전체 상한 안에서 우선순위대로 채움
  let remaining = MAX_TOTAL_CHARS - formatRepoInfo(info).length;
  candidates.forEach((c, i) => {
    const raw = raws[i]?.trim();
    if (!raw) return;
    const label = fileSection({ path: c.path, kind: c.kind, content: '', truncated: true }).length;
    const room = Math.min(c.cap, MAX_FILE_CHARS, remaining - label);
    if (room < 200) return;
    const content = raw.slice(0, room);
    info.files.push({ path: c.path, kind: c.kind, content, truncated: raw.length > room });
    remaining -= label + content.length;
  });

  return info;
}
