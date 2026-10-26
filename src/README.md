# 소스 모듈

6단계까지 실제 조회·저장과 공식 합성 재생, history의 비교 UI 및 UX U1~U7을 구현했습니다. 조회별 불변 보관본과 고정 링크 비교를 추가했습니다. 공식 영수증 연결·실제 이틀 대조는 후속 단계입니다. 책임과 데이터 흐름은 [architecture.md](../docs/architecture.md)에 정의합니다.

- `board/`: 정보판 UI와 조회·실패·재시도, 표시 전용 시계·경과 시간·대기 초·키보드 바로가기
- `history/`: 최근 두 KST 날짜의 비교 규칙과 계산 상세 카드; 실제/합성 화면에서 공유하되 표시와 입력은 분리
- `simulation/`: 공식 fixture 9개·순수 상태 전이 엔진·현재 창 메모리의 재생 UI. 서버·DB·fetch 접근 없음
- `shared/`: 실제 조회와 합성 재생의 공통 9개 필드 검증·전송 오류 분류·Retry-After·안내·KST 시각
- `server/`: 원천 조회·일별 기록·고정 보관본의 원자적 영속 저장
- `review/`: 불변 보관본·플랫폼 대조 항목 표시와 같은 앱의 두 고정 링크 비교

src/app은 Next.js App Router 진입점이며 API는 GET/POST /api/board입니다. server-only 모듈에서 고정 원천과 APP_DATABASE_URL에 접근합니다. 클라이언트는 공개 조회 결과만 받습니다. [기술 스택과 저장 방식](../docs/stack-and-storage.md)을 따릅니다.
