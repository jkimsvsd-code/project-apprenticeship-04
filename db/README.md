# 실제 Postgres 저장소

- Development/Preview: `t04-development`, Neon Free, 싱가포르(sin1)
- Production: `t04-production`, 별도 Neon Free DB, 싱가포르(sin1)
- 마이그레이션: `001_readings.sql`·`002_immutable_review_snapshots.sql`, 두 DB에 적용 완료

개발 환경변수는 `.env.local`, 운영 준비용 로컬 변수는 `.env.production.local`에 보관하며 둘 다 Git에서 제외합니다. 실제 연결 URL이나 비밀번호는 문서·명령 인자·출력에 넣지 않습니다.

## 역할

`DATABASE_URL_UNPOOLED`는 로컬 관리 스크립트가 migration과 역할 설정에 사용합니다. 일반 앱은 별도의 `t04_app` 역할을 담은 `APP_DATABASE_URL`만 읽습니다. 연결 설정이 없으면 오류를 표시하고 관리자 연결로 자동 대체하지 않습니다.

앱 역할 권한은 daily_readings·signal_state의 SELECT/INSERT/UPDATE와 review_snapshots의 SELECT/INSERT입니다. 고정 보관본 UPDATE/DELETE와 스키마 생성 권한은 없습니다. Runtime 역할 설정 스크립트는 이미 있는 역할의 비밀번호를 임의로 바꾸지 않습니다. 기존 역할이 있는데 연결값을 잃었다면 먼저 비공개 연결을 복구해야 합니다.

## 마이그레이션

```bash
# 실제 Development DB가 연결된 .env.local에서 실행
npm run db:migrate
node scripts/setup-runtime-role.mjs .env.local
```

파일명·SHA-256을 schema_migrations에 기록하며 같은 파일은 재적용하지 않습니다. 이미 적용한 SQL 파일을 수정하면 중단됩니다. 변경은 새 번호 파일로 추가합니다. 현재 runner는 세미콜론으로 구분된 단순 DDL만 지원하며 함수·프로시저 본문이 필요해지면 runner를 먼저 보완해야 합니다.

## 데이터 규칙

daily_readings의 UNIQUE(signal_id, record_date)와 조건부 UPSERT가 동일 날짜의 중복 행을 막습니다. signal_state의 서버 시도 번호와 transaction 잠금이 늦게 끝난 요청의 덮어쓰기를 막습니다. 원천 HTTP는 transaction 밖에서 호출합니다.

실제 데이터 원천·값·날짜를 지정하는 공개 API는 없습니다. 공개 새로고침은 서버에 고정된 서울 기온만 조회하며, DB에서 15초 간격 제한을 공유합니다. 원천 429 대기 시간이 더 길면 해당 제한을 반영합니다.

review_snapshots는 조회별 `(signal_id, fetched_at)` 고유키로 실제 원자료·정규화 값을 추가 전용으로 보관합니다. [고정 보관본](../docs/preserved-readings.md)은 재조회 후에도 같은 UUID 링크에서 읽고 두 링크를 지정해 비교합니다. 이 저장 행을 플랫폼 t04_day 봉인 영수증으로 간주하지 않습니다.

`npm run test:db`는 Development DB에서 임의 생성한 `test-stage4-` 신호만 사용합니다. 정리 시에도 그 신호의 행만 삭제하며 실제 서울 기온 기록에는 접근하지 않습니다. 운영 환경 파일이 있는 경우 DB 호스트가 같은지 검사해 운영 DB 대상 실행을 차단합니다.
