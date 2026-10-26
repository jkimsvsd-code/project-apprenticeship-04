# 실제 연결 준비

4단계의 Vercel·Neon 연결, 초기 migration과 앱 구현을 완료했습니다. 아래 상태와 연결 순서는 새 개발 환경을 준비할 때도 참고합니다.

## 2026-10-26 확인한 상태

| 항목 | 상태 |
| --- | --- |
| GitHub 소스 | jkimsvsd-code/project-apprenticeship-04, main push 완료 |
| Vercel 연결 계정의 팀 | jkimsvsd-code 확인 |
| Vercel 프로젝트 | project-apprenticeship-04, Next.js·Node.js 24, GitHub 연결 완료; Functions는 vercel.json에서 sin1 지정 |
| 로컬 .vercel/project.json | 연결 완료, Git 제외 |
| Vercel CLI | 65.2.0을 임시 도구 경로에서 사용, 로그인 완료 |
| Neon DB | t04-development와 t04-production, 무료 플랜·sin1, 환경별 분리 |
| 앱 runtime 변수 | APP_DATABASE_URL, 개발·프리뷰·운영 등록 완료 |
| 관리용 변수 | 통합의 DATABASE_URL_UNPOOLED, 값 비공개 |
| 마이그레이션 | 001_readings.sql, 두 환경 적용 완료 |
| 앱·개발 서버 | 설치·로컬 조회/저장/재접속 확인 완료 |

위 내용은 이 앱의 연결 상태이며 계정에 존재하는 모든 외부 자원을 전수 조사했다는 의미는 아닙니다.

## 4단계 실행 순서

1. 공식 Vercel CLI를 준비하고 사용자 계정과 팀을 확인합니다. 새 자원을 중복 생성하지 않도록 기존 프로젝트·통합을 다시 확인합니다.
2. GitHub 저장소에 대응하는 Vercel 프로젝트를 생성·연결하고 로컬 .vercel/project.json의 대상을 확인합니다. 미완성 앱의 자동 배포 상태와 공개 심사 준비 상태를 구분합니다.
3. Vercel Marketplace의 Neon 통합을 열어 현재 제공 플랜·지역을 확인하고 DB를 연결합니다. Auth·Realtime은 이 앱에 필요하지 않습니다. 약관 동의·계정 설치 확인이 필요하면 사용자가 해당 화면에서 완료합니다.
4. Production과 분리된 Development/Preview DB 또는 branch를 구성하고, 서버 전용 환경변수를 프로젝트에 연결합니다. 원격 환경변수를 .env.local로 내려받고 필요한 변수 이름·설정 여부만 검사합니다. 값은 출력하지 않습니다.
5. 실제 연결을 확인한 뒤 Next.js·React·TypeScript와 Neon driver를 호환되는 안정 버전으로 설치하고 package-lock.json을 커밋합니다. 설치된 Next.js의 동봉 문서를 기준으로 src/app과 서버 모듈을 작성합니다.
6. 버전 관리되는 SQL migration을 개발 DB에 적용합니다. 조회와 동일 날짜 중복 방지·갱신·재접속 후 보존을 확인합니다. 운영 DB에는 검토된 migration만 적용합니다.
7. 고정 Open-Meteo 조회 → 정규화 → 영속 저장 → 기본 정보판 표시를 연결합니다. 최초 상태, 서버 설정 오류, 저장 오류는 별도로 표시합니다.
8. DB·API 통합 시험, 타입·정적 검사와 build, 실제 화면 확인 후 단계 커밋·push를 남깁니다.

단위 시험의 독립적인 합성 메모리 저장소는 사용할 수 있지만 실제 제품 저장 완료의 대체물로 취급하지 않습니다. 제품의 실제 저장 경로는 Neon에 연결해 검증합니다.

## 환경변수 계획

- APP_DATABASE_URL: 앱 전용 역할의 연결. 앱이 읽는 유일한 DB 변수이며 브라우저 공개 금지.
- DATABASE_URL_UNPOOLED: 통합이 제공하는 관리 연결. 로컬 migration·역할 준비에만 사용.
- 통합의 DATABASE_URL·PG*·POSTGRES_*도 존재하지만 일반 앱 코드에서는 사용하지 않습니다.

`.env.example`에는 필요한 이름과 설명만 있습니다. 실제 값은 Git 제외된 환경 파일과 Vercel에 보관합니다. Development의 앱 변수는 로컬 env pull이 가능한 Config, Preview/Production의 앱 변수는 Secret으로 등록했습니다. DB 통합의 관리 연결과 앱 runtime 연결을 혼동하지 않습니다.

실행 가능한 install/dev/test/build 및 DB 명령은 [README](../README.md)에 있습니다. Neon DB 생성은 성공했으나 CLI의 부가 Neon 스킬 설치는 실패했습니다. 중복 DB를 생성하지 않고 공식 통합 가이드와 설치된 driver 문서로 구현했습니다. 추후 부가 스킬을 설치할 때 DB 설치 명령을 다시 실행하지 않습니다.
