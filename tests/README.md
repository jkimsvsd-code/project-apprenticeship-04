# 시험 구성

현재 제품 자동 시험은 구현되어 있지 않습니다. `node scripts/verify-task-assets.mjs`는 공식 자산의 무결성과 참조 adapter만 검사합니다. [검증 계획](../docs/verification.md)에 따라 제품용 시험 도구와 명령을 추가합니다.

- `unit/`: 날짜·계산·상태 전이 등 순수 규칙
- `integration/`: 원천 응답·저장·공식 fixture 계약
- `e2e/`: 공개 화면·실패 재생·복구·모바일·키보드 조작

시험에는 합성 값만 사용합니다. 공식 fixture는 `public/task-assets/t04/` 원본을 참조하고 중복 사본을 수정하지 않습니다. 실제 이틀 기록은 자동 시험이 생성하거나 대체하지 않습니다.
