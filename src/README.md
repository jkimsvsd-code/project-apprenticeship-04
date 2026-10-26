# 소스 모듈

4단계에서 app/board/shared/server의 기본 흐름을 구현했습니다. history와 simulation의 상세 구현은 후속 단계입니다. 책임과 데이터 흐름은 [architecture.md](../docs/architecture.md)에 정의합니다.

- `board/`: 정보판 UI와 조회·실패·재시도 표시
- `history/`: 일별 기록과 변화량 UI·규칙
- `simulation/`: 공식 합성 재생과 실제 기록 격리
- `shared/`: 정규화·응답 검증·KST 시각·공통 상태 규칙
- `server/`: 원천 조회와 실제 기록 영속 저장

src/app은 Next.js App Router 진입점이며 API는 GET/POST /api/board입니다. server-only 모듈에서 고정 원천과 APP_DATABASE_URL에 접근합니다. 클라이언트는 공개 조회 결과만 받습니다. [기술 스택과 저장 방식](../docs/stack-and-storage.md)을 따릅니다.
