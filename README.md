# RepoPilot

해커톤 프로젝트. Next.js(App Router) + Supabase + Vercel.

```sh
npm ci
npm run dev
```

- `.env.example`을 `.env.local`로 복사해 Supabase URL과 Publishable key를 입력합니다.
- 새 테이블은 `rg_` 접두사를 사용합니다. DB 변경은 `npx supabase db push --remote`, 코드 배포는 GitHub push로 진행합니다.
- `supabase/migrations`의 `hy_company_init`은 공유 DB의 적용 이력 동기화용입니다. 삭제하지 않습니다.
