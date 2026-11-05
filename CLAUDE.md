# README Generator (해커톤)

## 프로젝트
- HY컴퍼니 프로젝트에서 복제한 해커톤용 "README 한방 생성기".
- GitHub 링크나 설명을 넣으면 AI가 강사님 README 구성에 맞춰 README, 진단 점수, 이력서 문구, 면접 질문을 만들어 줍니다.
- 스택: Next.js App Router, TypeScript, npm, Supabase(hosted, 기존 프로젝트 재사용), Vercel.

## 보안·비밀
- 환경변수 값은 어떤 출력·로그에도 절대 보여주지 않습니다. `.env.local`은 열지 않습니다.
- 키·토큰·DB 비밀번호를 출력하거나 Git에 올리지 않습니다. secret/service_role 키는 쓰지 않습니다.

## Supabase (HY컴퍼니와 공유)
- 새 테이블은 반드시 `rg_` 접두사. `hy_company_*` 테이블과 마이그레이션은 수정·삭제하지 않습니다.

## 실행 전 확인이 필요한 작업
- `git push`, Vercel 배포, Supabase DB 반영은 반드시 실행 전에 사용자에게 확인받습니다.

## 작업 방식
- 기존 코드는 통째로 다시 쓰지 말고 필요한 부분만 수정합니다.
- 작업이 끝나면 빌드를 확인하고(`npm run build`, `npm run typecheck`) 결과를 5줄 이내로 요약합니다.

## 서비스 원칙
- 입력에 없는 사실은 지어내지 말고 `[여기에 작성]`으로 남깁니다.

## 크레딧 절약
- 저장소에서 읽는 양은 파일당 3000자, 전체 12000자를 상한으로 합니다.
