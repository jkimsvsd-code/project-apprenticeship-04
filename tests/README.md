# 시험 구성

4단계에서 Vitest 단위 시험 12개와 실제 개발 DB 통합 시험 4개를 구현했습니다. `npm test`, `npm run test:db`로 실행합니다. `node scripts/verify-task-assets.mjs`는 별도로 공식 자산과 참조 adapter만 검사합니다. Playwright는 설치했으며 자동 화면 시나리오는 후속 단계에 작성합니다. 기본 화면은 실제 브라우저로 확인했습니다.

- `unit/`: KST 자정·원천 정규화·응답 변형 거절·Origin/Host 검증·입력 주입 거절·DB 오류 비노출
- `integration/`: 동시 시도 제한·같은 날짜 갱신·record ID 유지·실패 보존·오래된 시도 거절·runtime 권한
- `e2e/`: 공개 화면·실패 재생·복구·모바일·키보드 자동 검증 예정

시험에는 합성 값만 사용합니다. 공식 fixture는 `public/task-assets/t04/` 원본을 참조하고 중복 사본을 수정하지 않습니다. 실제 이틀 기록은 자동 시험이 생성하거나 대체하지 않습니다.
