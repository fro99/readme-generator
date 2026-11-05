import 'server-only'; // 이 파일은 서버에서만 import 가능 (AI 키가 브라우저로 노출되지 않도록)
import Anthropic from '@anthropic-ai/sdk';

// task: 'fast'는 가볍고 빠른 모델(AI_MODEL_FAST), 'main'은 품질 우선 모델(AI_MODEL_MAIN)
export type AiTask = 'fast' | 'main';

export type GenerateResult = {
  text: string; // 생성된 결과 텍스트
  model: string; // 실제 사용한 모델명
  inputChars: number; // 입력 길이(글자 수, 대략값)
  outputChars: number; // 출력 길이(글자 수, 대략값)
  durationMs: number; // 소요 시간(ms)
};

// 설정 누락 같은 "서버 쪽 문제"를 구분하기 위한 에러
export class AiConfigError extends Error {}

const MAX_TOKENS = 1500; // 출력 토큰 상한
const TIMEOUT_MS = 280_000; // 함수 제한(300초)보다 약간 짧게

function readConfig(task: AiTask) {
  const provider = (process.env.AI_PROVIDER ?? '').trim();
  const apiKey = process.env.AI_API_KEY?.trim();
  const baseUrl = process.env.AI_BASE_URL?.trim() || undefined;
  const model = (task === 'fast' ? process.env.AI_MODEL_FAST : process.env.AI_MODEL_MAIN)?.trim();
  if (provider !== 'anthropic' && provider !== 'openai') {
    throw new AiConfigError('AI_PROVIDER는 "anthropic" 또는 "openai"여야 합니다.');
  }
  if (!apiKey) throw new AiConfigError('AI_API_KEY가 설정되지 않았습니다.');
  if (!model) throw new AiConfigError(`${task === 'fast' ? 'AI_MODEL_FAST' : 'AI_MODEL_MAIN'}가 설정되지 않았습니다.`);
  return { provider, apiKey, baseUrl, model } as const;
}

// Anthropic 공식 SDK로 호출
async function callAnthropic(cfg: ReturnType<typeof readConfig>, prompt: string): Promise<string> {
  const client = new Anthropic({ apiKey: cfg.apiKey, baseURL: cfg.baseUrl, timeout: TIMEOUT_MS, maxRetries: 1 });
  const res = await client.messages.create({
    model: cfg.model,
    max_tokens: MAX_TOKENS,
    messages: [{ role: 'user', content: prompt }],
  });
  // 응답은 여러 블록일 수 있으므로 텍스트 블록만 이어 붙임
  return res.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
}

// OpenAI 호환 chat completions를 fetch로 호출
async function callOpenAi(cfg: ReturnType<typeof readConfig>, prompt: string): Promise<string> {
  const base = (cfg.baseUrl ?? 'https://api.openai.com/v1').replace(/\/+$/, '');
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`AI 응답 오류(${res.status})`); // 본문에 민감 정보가 있을 수 있어 상태코드만 남김
  const data = (await res.json()) as { choices?: { message?: { content?: string | null } }[] };
  return data.choices?.[0]?.message?.content ?? '';
}

// AI 호출은 이 함수 하나로만 한다.
export async function generate({ task, prompt }: { task: AiTask; prompt: string }): Promise<GenerateResult> {
  const cfg = readConfig(task);
  const started = Date.now();
  const text = cfg.provider === 'anthropic' ? await callAnthropic(cfg, prompt) : await callOpenAi(cfg, prompt);
  return {
    text,
    model: cfg.model,
    inputChars: prompt.length,
    outputChars: text.length,
    durationMs: Date.now() - started,
  };
}
