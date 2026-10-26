# 검증 증거

공식 자산·참조 adapter, 원천 사전 조회, 기본 화면·실제 개발 DB 종단 검증, 5단계 합성 재생과 6단계 비교·UX와 7A 공개 접근·보안과 8A 제출문 초안 검토 자료를 수집했습니다. 2026-10-27에는 실제 운영의 10월 26·27일 값·원자료·저장값·고정 화면·변화량 대조 자료를 [real/](real/README.md)에 추가했습니다. 플랫폼 봉인 영수증은 사용자 확인 기준 0건이며 공식 영수증 검증은 남아 있습니다.

## implementation/

`stage4.json`과 `stage4-board.png`는 실제 원천 → API → 개발 DB → 화면과 재접속 보존의 확인 자료입니다. Development DB에서 조회한 서울 기온 1개 날짜이며 플랫폼 t04_day 영수증이 아닙니다. 운영 DB와 분리했음을 함께 확인했습니다.

`production-first-reading.json`과 `production-board.png`는 배포 후 별도로 확인한 운영 첫 실제 조회와 재접속 보존 자료입니다. 해당 코드 commit과 검증 시각을 기록했습니다. 이 역시 플랫폼 봉인 영수증이 아니며 실제 이틀 완료로 계산하지 않습니다.

`stage5.json`, `stage5-failure.png`, `stage5-recovery.png`는 합성 재생의 앱 검증·화면 증거입니다. 단위 42개·실제 개발 DB 통합 4개·빌드를 확인했고, 브라우저 재생 전후 실제 읽기 API 응답이 완전히 같음을 대조했습니다. 합성 105/120pt·8월 날짜를 실제 기온·실제 이틀로 계산하지 않습니다.

`stage5-production.json`과 `stage5-production.png`는 5단계 코드의 운영 배포 Ready·HTTP 200·브라우저 실패 5종/복구 및 실제 운영 기록 불변 확인 자료입니다. 합성 상태만 조작했고 실제 기온 새로고침은 실행하지 않았습니다.

`stage6.json`은 일별 비교·경과 시간·대기·기본 접근성 검증 범위입니다. `stage6-mobile390.png`와 `stage6-mobile320.png`는 좁은 화면의 공유 계산 카드/실제 정보판, `stage6-comparison.png`는 합성 계산 상세 화면입니다. 합성 비교와 개발 DB의 폐기용 두 날짜 시험을 실제 이틀 증거로 계산하지 않습니다.

`stage7a.json`과 `stage7a-public.png`는 보안 헤더 적용 후 운영 배포·실제 무로그인 조회·사용자 시크릿 창 확인의 자료입니다. 시크릿 창은 자동 브라우저 점검으로 대체했다고 주장하지 않고 사용자의 직접 확인으로 기록했습니다.

`stage8a.json`은 제출문 초안의 확인법 4줄·판단 기록 3줄·단일 HTTPS 주소와 소스 commit 형식·문구 근거·남은 검증 항목을 확인한 기록입니다. 실제 영수증·플랫폼 제출·최종 채점 결과가 아닙니다.

## security/

`public-access-and-secret-scan.json`은 쿠키 없는 요청·입력 거절·실제 기록 불변·Git/빌드/네트워크 검사 결과, `dependency-audit.json`은 npm 전체 의존성의 시점별 검사 결과입니다. `browser-replays.json`은 보안 헤더 적용 후 실패 5종/복구, `production-live-refresh.json`은 실제 운영 첫날 재조회·같은 날짜 ID 유지·다른 무인증 클라이언트의 429 대기 제한을 기록합니다. 비밀값이나 오류 로그 원문은 포함하지 않습니다.

## source-selection/

선정 원천의 실제 응답·조회 시각·정규화 매핑 예시를 보관합니다. 원천 적합성 확인 자료이며 앱 영속 저장값·화면값·t04_day 영수증을 대체하지 않습니다.

## real/

서로 다른 실제 KST 날짜에 조회한 공개 원천 기록 2건의 대조 자료를 보관합니다.

현재 10월 26일 14.6°C·27일 12.8°C, 1.8°C 감소를 [대조 보고서](real/two-day-verification.json)와 [공개 화면](real/two-day-comparison.png)에 기록했습니다. 자세한 범위와 각 파일은 [실제 자료 안내](real/README.md)를 확인하세요. 기존 단계별 한 날짜 자료는 당시 결과로 유지합니다.

- 각 기록: KST 조회 날짜, 공개 원천 URL, 원천 관측 시각, 실제 조회 시각, 정규화 값, 단위, 대조 가능한 비개인 원자료
- 대조: 원자료·저장값·화면값 일치 여부, 두 기록의 날짜 순서, 변화량 계산식과 결과
- 필요 시: 공개 화면 캡처와 검증 일시

공식 공개 계약 v2에서 실제 이틀 조건은 플랫폼의 봉인된 `t04_day` 영수증 정확히 2건과 대조합니다. 날짜는 `server_created_at`의 KST 날짜입니다. 공개용 검증 자료와 플랫폼 발급물을 구분하고 자체 봉인 영수증을 만들지 않습니다.

빈 틀이나 합성 값을 실제 조회 증거로 표시하지 않습니다. 로컬 런타임 데이터는 `.data/` 등에서 관리하고 검토한 비개인 증거만 이곳에 추가합니다.

## synthetic/

현재 `asset-verification.json`은 공식 package ID·버전·SHA-256 대조와 참조 adapter의 D1-A → D1-B, 실패 5종, recover-d2 검사 결과입니다. 제품 구현의 시험 결과가 아닙니다. `stage5-browser-replays.json`은 실제 앱 화면에서 읽은 실패 5종별 실패/복구 전체 상태입니다. `stage5-browser-extra.json`은 동일 날짜 ID 유지·다음 날짜·초기 실패·초기화 확인 결과이며, `stage5-live-isolation.json`은 개발 실제 읽기 응답의 재생 전후 완전 일치 결과입니다.

## 공개 자료 원칙

원천 자체는 공개 비개인 데이터여야 하며, 인증 헤더·쿠키·토큰·비밀키·계정 화면·개인 기록을 증거에 넣지 않습니다. 브라우저 네트워크 전체 덤프 대신 필요한 비개인 응답만 보관합니다. 공식 자산 원본은 `public/task-assets/t04/`에서 관리합니다.

## 고정 보관 기능

`implementation/review-preservation.json`과 `review-*.png`는 실제 조회별 고정 보관·화면 검증입니다. `implementation/review-immutability.json`은 개발 환경의 실제 공개 원천 재조회 전후 비교 자료입니다. 같은 KST 날짜의 17°C 보관본이 실제 재조회 후에도 그대로 남고 새 링크가 추가됨을 대조했습니다. 이 자료의 한 날짜 상태는 당시 결과이며, 이후 두 실제 날짜 값 대조는 `real/`에 별도로 기록했습니다. 공식 t04_day 영수증은 여전히 0건입니다.

`implementation/review-production.png`와 `review-production-immutability.json`은 공개 운영 배포에서 실제 재조회 뒤에도 원래 보관본의 원자료·정규화 값이 그대로 유지된 확인 자료입니다. 같은 실제 KST 날짜에 만든 여러 보관본이며 실제 이틀·공식 영수증 검증을 대신하지 않습니다.
