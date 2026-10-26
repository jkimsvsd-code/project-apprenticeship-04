# 소스 모듈

현재 각 하위 폴더는 구현 전 자리입니다. 책임과 데이터 흐름은 [architecture.md](../docs/architecture.md)에 정의합니다.

- `board/`: 정보판 UI와 조회·실패·재시도 표시
- `history/`: 일별 기록과 변화량 UI·규칙
- `simulation/`: 공식 합성 재생과 실제 기록 격리
- `shared/`: 정규화·응답 검증·KST 시각·공통 상태 규칙
- `server/`: 원천 조회와 실제 기록 영속 저장

선택한 프레임워크는 Next.js App Router입니다. src/app 진입점·라우트·설정은 실제 Vercel·Neon 연결 후 4단계에서 추가합니다. 외부 API·Neon 접근은 서버 모듈에 두고 화면 코드와 분리합니다. [기술 스택과 저장 방식](../docs/stack-and-storage.md)을 따릅니다.
