# 실제 연결 준비

이 문서는 4단계의 실행 순서입니다. 현재는 3단계 설계 결정만 완료했으며 앱이나 DB를 설치하지 않았습니다.

## 2026-10-26 확인한 상태

| 항목 | 상태 |
| --- | --- |
| GitHub 소스 | jkimsvsd-code/project-apprenticeship-04, main push 완료 |
| Vercel 연결 계정의 팀 | jkimsvsd-code 확인 |
| 이 프로젝트 이름의 Vercel 프로젝트 | 해당 팀의 검색 결과 없음 |
| 로컬 .vercel/project.json | 없음 |
| Vercel CLI | 현재 셸 PATH에서 확인되지 않음 |
| 이 앱용 Neon DB·DATABASE_URL | 생성·연결·검증 미실행 |
| 앱 패키지·마이그레이션·개발 서버 | 미설치·미실행 |

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

- DATABASE_URL: 일반 앱 서버의 개발/운영 DB 연결. 브라우저 공개 금지.
- DATABASE_MIGRATION_URL: 권한 분리가 필요한 경우 migration 전용 연결. 실제 제공 변수명과 권한을 확인한 뒤 확정.

아직 가짜 연결 문자열이나 빈 비밀값 파일을 만들지 않았습니다. 통합이 제공하는 실제 변수명을 확인해 .env.example에는 이름과 설명만 작성합니다. .env.local은 Git 제외 대상입니다.

현재 실행 가능한 명령은 기존 공식 자산 검사뿐입니다: `node scripts/verify-task-assets.mjs`. 앱의 install/dev/test/build 명령은 구현·실행 확인 후 README에 추가합니다.
