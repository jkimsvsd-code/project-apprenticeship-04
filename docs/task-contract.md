# 공개 계약 v2와 PDF 대조

확인일: 2026-10-26 KST. 사용자가 제공한 PDF의 공개 자산 링크에서 인증 없이 HTTP 200으로 다운로드했습니다. 로그인 뒤 과제 웹 본문 자체를 새로 확인한 것은 아닙니다.

## 확보한 자산

- package ID: `aleph-t04-real-information-board-public-contract-v2`
- 공개 계약: `2.0.0`
- 고정 fixture 계약: `1.1.0`
- registry: `T04-C01`~`T04-C35`, 총 35개 조건
- ZIP 파일명은 `t04-real-information-board-public-v1.zip`이지만 내부 공개 계약은 v2입니다. 파일명에서 버전을 추정하지 않습니다.
- 원본 파일 18개 중 manifest에 열거된 17개 파일의 크기·SHA-256이 일치합니다.
- manifest는 자체 해시를 포함하지 않으며 ZIP도 순환 참조 때문에 목록에서 제외됩니다. 두 파일의 별도 관측 해시와 다운로드 메타데이터를 증거에 남깁니다.

원본은 [공식 자산 폴더](../public/task-assets/t04/), 대조 결과는 [검증 보고서](../evidence/synthetic/asset-verification.json)에 있습니다. 공식 서명 검증이 아닌 HTTPS 원천·manifest·다운로드 파일의 일치 확인입니다.

## PDF와 비교해 구체화된 내용

| 항목 | 현재 공개 계약의 의미 | 프로젝트 반영 |
| --- | --- | --- |
| C02, C29~C33 | 로그인·인증·초대·비밀번호·OAuth·CAPTCHA 없이 공개 | 기존 R7의 세부 검사로 연결 |
| C34 | 결과물 필드에 HTTPS URL 한 개 | 제출 템플릿에 반영 |
| C35 | 소스 HTTPS URL에 전체 소스를 복원할 수 있는 40/64자리 소문자 hex commit ID 포함 | 최종 제출 시 커밋 permalink 사용 |
| C22~C24 | 봉인된 t04_day 영수증 2건의 payload와 앱 저장값·화면값·계산 대조 | 원천 사전 조회와 실제 검증 완료를 분리 |

35개 제품 조건은 아직 전수 판정하지 않았습니다. 참조 adapter 시험 성공을 제품 조건의 MET 판정으로 바꾸지 않습니다. 원본 조건별 내용은 [criterion-registry.json](../public/task-assets/t04/criterion-registry.json)에 있습니다.

## 실제 이틀 증거

최종 제출 꾸러미의 `제출정보.json.과정영수증[]`에서 canonical kind가 `t04_day`인 영수증이 정확히 2건이어야 합니다. 각 `server_created_at`을 `Asia/Seoul`로 변환한 날짜가 달라야 합니다.

영수증 payload의 필드는 `source_url`, `source_observed_at`, `normalized_value`, `unit`입니다. 공통 정규화 모델의 `source_time`은 이 payload의 `source_observed_at`에 대응합니다. 두 영수증의 순서는 `server_created_at`으로 정하고 앱의 같은 날짜 저장값·화면값 및 변화량과 대조합니다.

공개 꾸러미에는 플랫폼 영수증 발급 API나 사용자 조작 절차가 명시되어 있지 않습니다. 앱 데이터와 실제 날짜를 보존하되 봉인·발급 자체를 모방하지 않습니다. 실제 검증 단계에서 플랫폼의 공식 절차를 확인해야 합니다. 학생이 별도의 인증 파일이나 증거 ZIP을 손으로 만들 필요는 없습니다.

## 합성 재생 계약

- 공통 정규화 키: `signal_id`, `normalized_value`, `unit`, `source_name`, `source_url`, `source_time`, `fetched_at`, `record_timezone`, `record_date`.
- 같은 `signal_id + record_date`는 원자적으로 갱신하고 `record_id`를 유지합니다.
- 정상 D1-A=100 → D1-B=105는 한 행, D2=120은 두 행입니다.
- 실패 5종은 `stale`과 `timeout / auth / rate_limit / offline / schema_error`를 사용하고 마지막 정상값 105와 한 행을 유지합니다.
- 지정 복구는 `fresh / none`, 두 행, 다음 날짜 신규 행 정확히 한 건, 값 120입니다.
- 변화는 방향과 절대 크기를 구분합니다. 참조 adapter의 `last_delta`는 절대 크기 15이며 방향은 `last_comparison.direction`에 있습니다. 화면은 증가/감소와 단위를 함께 표시합니다.
- 초기 상태는 정상값·상태가 `null`입니다. 실패부터 시작할 때 UI는 값이 없음을 별도로 설명해야 합니다.

합성 재생은 실제 원천 호출·실제 날짜·화면 검증을 대체하지 않습니다.
