# 기술 스택과 영속 저장 결정

상태: 3단계 설계 결정 완료. 결정일: 2026-10-26 KST. 서비스 생성·SDK 설치·마이그레이션·앱 실행은 아직 하지 않았습니다.

## 선택

| 영역 | 결정 | 이 프로젝트에서의 역할 |
| --- | --- | --- |
| 화면·서버 | Next.js App Router + React | 한 저장소에서 정보판과 서버 조회 경로 관리 |
| 언어 | TypeScript, strict 설정 | 원천 응답·정규화 값·오류·저장 모델의 경계 명시 |
| 런타임 | Node.js 24.x | 로컬과 Vercel Functions에서 같은 major 사용 |
| 패키지 관리 | npm, package-lock.json | 설치 후 npm ci로 재현 |
| 스타일 | CSS Modules + 공통 CSS 변수 | 모바일·초점·상태 표시를 직접 조정 |
| 공유 영속 저장 | Neon Postgres | KST 일별 고유키·원자적 갱신·일관된 상태 보존 |
| DB 접근 | @neondatabase/serverless의 HTTP 경로 | 서버에서 매개변수화 SQL과 비대화형 transaction 실행 |
| 배포 | Vercel, Node.js 런타임 | HTTPS 결과물과 서버 조회 배포 |
| 단위·통합 시험 | Vitest | 날짜·계산·상태 전이·실제 시험 DB 저장 동작 확인 |
| 화면 시험 | Playwright | 공개 화면·재생·모바일·키보드 조작 확인 |
| 정적 검사 | TypeScript + ESLint | 타입·코드 품질 검사 |

구현 단계에서 지원 중인 안정 버전과 Next.js의 React peer dependency를 확인하고 정확한 설치 버전을 package.json·package-lock.json에 기록합니다. 현재 문서가 특정 패키지 버전의 설치나 호환성 시험 완료를 뜻하지는 않습니다. 설치한 Next.js의 동봉 문서를 읽고 코드를 작성합니다.

이 앱에는 사용자 로그인·Auth SDK·ORM·별도 백엔드 서비스·별도 캐시 서비스를 추가하지 않습니다. 원천 API는 기존 Open-Meteo 설정을 유지합니다.

## 선택 근거

Next.js Route Handler로 고정 공개 원천 호출과 DB 접근을 서버에 둘 수 있고, 화면과 API를 한 프로젝트에서 배포할 수 있습니다. 기존 board/history/simulation/shared/server 모듈은 유지하며 src/app을 라우트 진입점으로 추가합니다.

일별 기록은 여러 방문자가 같은 값을 보고 배포가 바뀌어도 남아 있어야 합니다. Postgres의 고유 제약과 ON CONFLICT 갱신을 이용하면 동시 성공 조회가 같은 날짜의 행을 중복 생성하는 문제를 DB에서 막을 수 있습니다. 여러 상태 변경은 짧은 transaction으로 묶습니다.

| 검토한 방식 | 판단 |
| --- | --- |
| Neon Postgres | 선택. 일별 고유키·조건부 갱신·관계형 조회를 한 저장소에서 처리 |
| Vercel Functions 내부 JSON/SQLite 파일 | 이 배포 방식의 공용 영속 기록으로 채택하지 않음. 고정 영속 디스크를 운영하는 별도 서버는 이번 범위 밖 |
| 브라우저 localStorage | 각 방문자의 합성 재생 상태에는 사용할 수 있으나 공용 실제 기록의 저장소로 쓰지 않음 |
| Redis | 구현 가능하나 이번 일별 기록·일관된 갱신 요구에는 Postgres를 사용해 구성 단순화 |

## 저장 모델과 보존 규칙

아래는 논리 설계이며 실제 SQL 마이그레이션은 4단계에서 작성·검증합니다.

### daily_readings: 날짜별 대표 기록

- record_id 기본키와 UNIQUE(signal_id, record_date)를 둡니다.
- 원천 URL·source_time·fetched_at·정규화 값·단위·원천명·KST 날짜와 비개인 원자료를 보존합니다.
- 시각은 timestamptz, 날짜는 date, 기온 값은 numeric, 원자료는 jsonb로 설계합니다.
- 같은 날짜의 성공은 동일 record_id를 유지하는 조건부 UPSERT로 합칩니다.
- 서버가 날짜를 만들며 공개 요청으로 임의의 값·날짜·원천 URL을 주입하지 못하게 합니다.
- 원자료와 원천 정밀도를 보존하고 표시용 반올림은 별도로 처리합니다.

### signal_state: 마지막 정상값과 최근 시도

- signal_id당 한 행에 마지막 정상 기록 참조, freshness, error_code, 최근 시도 시각·순서와 재시도 대기 정보를 보존합니다.
- 성공 시 일별값과 정상 상태를 한 transaction으로 반영합니다.
- 실패는 상태·오류만 바꾸며 마지막 정상값과 기존 일별값을 지우지 않습니다.
- 늦게 끝난 요청이 더 최신 시도의 상태나 값을 덮어쓰지 않도록 서버가 부여한 시도 순서와 조건부 갱신을 사용합니다.
- 원천 HTTP 호출과 응답 검증은 DB transaction 밖에서 수행해 잠금 시간을 짧게 유지합니다.
- 성공 화면은 저장 commit 이후에 반환합니다. 저장 실패를 정상 기록 완료로 표시하지 않습니다.

### review_snapshots: 실제 이틀 제출 대조용 고정 값

- 플랫폼 영수증과 대조할 때 선택한 일별 기록의 원자료·정규화 값·시각을 고정 보관합니다.
- 이후 같은 날짜의 대표값이 갱신돼도 제출 대조 뷰가 참조하는 snapshot은 덮어쓰지 않습니다.
- 대조 뷰는 snapshot의 날짜·값·시각과 비교 계산을 명확히 표시합니다.
- 봉인 영수증은 플랫폼에서 발급합니다. 이 테이블의 저장 행을 t04_day 영수증이라고 부르거나 자체 서명하지 않습니다.
- 영수증 연결 절차는 플랫폼 공식 절차 확인 후 구현합니다. 개인정보나 인증 원문은 저장하지 않습니다.

## 실제 데이터와 합성 재생의 경계

live adapter는 고정 Open-Meteo 응답을 공통 정규화 모델로 변환하고 실제 저장소에 전달합니다. replay adapter는 공식 fixture를 공통 정규화·상태 규칙에 전달하되 방문자별 독립 메모리 상태만 변경합니다. 합성 reset은 실제 DB에 접근하지 않습니다.

서버 비밀값은 서버 전용 모듈에서만 읽습니다. DATABASE_URL을 NEXT_PUBLIC_ 접두사 변수, 응답 본문, 로그, Git에 넣지 않습니다. 마이그레이션 권한과 일반 앱의 조회·삽입·갱신 권한은 분리하는 방향으로 설정합니다.

공개 조회·새로고침은 사용자 로그인을 요구하지 않습니다. 읽기 요청은 저장값을 조회하고, 수동 새로고침은 고정 원천만 호출합니다. 서버의 요청 간격 제한과 시도 순서 관리를 DB에서 공유해 중복 호출·동시 갱신을 조정합니다. 임의 SQL·값·날짜를 받는 공개 쓰기 API를 만들지 않습니다.

## 환경 분리와 실제 연결 순서

- Development/Preview는 운영 기록과 분리된 DB 또는 branch를 사용합니다.
- Production은 실제 공개 기록을 보관하는 고정 DB/branch를 사용합니다.
- 공유 실제 기록의 유일한 사본을 로컬 .data/나 임시 배포 파일에 두지 않습니다.
- migrations는 버전 관리하되 연결 문자열과 런타임 데이터는 커밋하지 않습니다.
- 배포 런타임과 DB 지역은 가능한 가깝게 선택하되 생성 당시 제공 지역·플랜을 확인합니다.

우선 Vercel Marketplace의 Neon 관리형 통합으로 연결합니다. 사용자 계정·약관·플랜 확인이 필요한 설치 화면은 실제 연결 단계에서 사용자가 완료합니다. 현재 선택은 서비스 설치나 유료 플랜 사용을 의미하지 않습니다.

연결과 환경변수 검증을 완료한 뒤 SDK 설치·마이그레이션·개발 서버 실행을 진행합니다. 연결 실패를 mock DB나 메모리 실제 기록으로 대체하지 않습니다. 자세한 절차와 현재 상태는 [setup.md](setup.md)에 있습니다.

## 공식 근거

- [Next.js 설치와 프로젝트 구성](https://nextjs.org/docs/app/getting-started/installation)
- [Next.js Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers)
- [Vercel Node.js 지원 버전](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
- [Vercel 저장소 선택](https://vercel.com/docs/storage)
- [Neon Vercel 관리형 연결](https://neon.com/docs/guides/vercel-managed-integration)
- [Neon HTTP driver와 transaction](https://neon.com/docs/serverless/serverless-driver)
- [Postgres INSERT ON CONFLICT](https://www.postgresql.org/docs/current/sql-insert.html)
- [Vitest](https://vitest.dev/guide/) · [Playwright](https://playwright.dev/docs/intro)
