import 'server-only';
import { createClient } from '@supabase/supabase-js';

// 서버 전용 Supabase 클라이언트 (publishable key만 사용). 새 테이블은 rg_ 접두사를 씁니다.
export function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) throw new Error('Supabase 환경변수가 설정되지 않았습니다.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
