# 시험 구성

6단계까지 Vitest 단위 시험 63개와 실제 개발 DB 통합 시험 6개를 구현했습니다. `npm test`, `npm run test:db`로 실행합니다. `node scripts/verify-task-assets.mjs`는 별도로 공식 자산과 참조 adapter만 검사합니다. Playwright는 설치했으며 자동 화면 시나리오는 후속 단계에 작성합니다. 기본 화면·실제 조회/대기·합성 재생/비교·320/390px·키보드 초점과 조작은 실제 브라우저로 확인했습니다. 실패 5종별 전후 상태는 [브라우저 재생 증거](../evidence/synthetic/stage5-browser-replays.json)에 있습니다.

- `unit/`: KST 자정·9개 필드 정규화·전송 오류 분류·Retry-After·실제 서비스 오류 경로·Origin/Host·입력 주입·DB 오류 비노출. 합성 엔진의 정상/실패/복구 전체 상태를 해시 확인된 공식 참조 adapter와 대조하고, 초기 실패·같은 날 ID 유지·세션 독립·초기화·반복 복구·expected 변조를 검사합니다.
- `integration/`: 동시 시도 제한·같은 날짜 갱신·record ID 유지·실패 보존·오래된 시도 거절·Retry-After 저장/차단·합성 다음 날짜 저장값 비교·runtime 권한
- `e2e/`: 별도 Playwright 자동 시나리오는 미작성. 현재 브라우저 검증은 CUA의 실제 화면·키보드·DOM 읽기·스크린샷으로 수행하며 [6단계 보고서](../evidence/implementation/stage6.json)에 기록합니다.
- 추가 단위 범위: 최근 날짜 선택·단위 불일치·비연속 날짜·음수/0·부동소수점, 경과 시각·대기 경계와 화면의 첫 방문/초기 실패/정상값 보존/대기 문구·계산 상세 렌더링

시험에는 합성 값만 사용합니다. 공식 fixture는 `public/task-assets/t04/` 원본을 참조하고 중복 사본을 수정하지 않습니다. 실제 이틀 기록은 자동 시험이 생성하거나 대체하지 않습니다.
