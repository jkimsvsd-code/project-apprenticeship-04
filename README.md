# 오늘의 진짜 정보판

외부 데이터 조회가 실패해도 마지막 정상값을 보존하고, 값의 출처·시각·실패 이유를 설명하는 과제 4 프로젝트입니다.

현재는 **공식 자산 검증과 데이터 원천 선정을 마친 단계**입니다. Open-Meteo의 서울 고정 지점 기온을 사용하며, 실행 가능한 앱·영속 저장·배포는 다음 단계입니다.

## 구현 범위

- 필수: 실제 공개 값 하나 조회, 맥락 표시, 실패 다섯 종류 재생, 마지막 정상값 보존과 복구, KST 일별 기록, 실제 이틀 검증, 무로그인 공개 및 비밀값 보호, 제출 증거.
- UX: 첫 방문 안내, 마지막 성공 경과 시간, 중복 요청 방지, 재시도 대기 안내, 변화량 계산 상세, 모바일·키보드 접근성, 공개 심사용 합성 재생 패널(U1~U7).
- 후속 확장: 자동 갱신 및 장기 추이 차트(U9).
- 현재 범위에서 제외: 검증 결과 복사·다운로드(U8, 미승인).

## 폴더 구조

```text
project-apprenticeship-04/
├── README.md
├── CONTRIBUTING.md           # 단계별 검증·커밋 원칙
├── .gitignore
├── config/
│   └── live-source.json      # 고정 공개 원천·단위·필드 매핑
├── scripts/
│   └── verify-task-assets.mjs # 공식 해시·참조 상태 전이 검사
├── docs/
│   ├── requirements.md       # 과제 기준과 승인된 UX 범위
│   ├── architecture.md       # 모듈 책임·저장·오류·시각 처리
│   ├── verification.md       # 실제 조회 및 합성 시험 확인 절차
│   ├── submission.md         # 제출문 작성 틀
│   ├── data-source.md        # 원천 선택·시각·이용 조건
│   ├── task-contract.md      # 공개 계약 v2와 PDF 대조
│   └── roadmap.md            # 구현 순서와 후속 확장
├── src/
│   ├── README.md
│   ├── board/                # 값·출처·시각·상태·재시도 UI
│   ├── history/              # KST 일별 기록·변화량·계산 상세
│   ├── simulation/           # 합성 실패·복구 재생 및 격리 상태
│   ├── shared/               # 값 정규화·시간·원천 응답 검증
│   └── server/               # 조회 경로·영속 저장·실제 기록 보호
├── public/
│   └── task-assets/
│       ├── README.md
│       └── t04/              # 공식 자산 원본 18개
├── tests/
│   ├── README.md
│   ├── unit/                 # 날짜·변화량·상태 전이
│   ├── integration/          # 조회·저장·공식 fixture 계약
│   └── e2e/                  # 무로그인 화면·재생·접근성
└── evidence/
    ├── README.md
    ├── real/                 # 공개 원천의 실제 이틀 검증 증거
    ├── source-selection/     # 원천 사전 조회; 실제 이틀 영수증 아님
    └── synthetic/            # 공식 해시·참조 adapter 검증 결과
```

빈 구현·시험·실제 증거 폴더는 `.gitkeep`으로 보존합니다. 공식 자산과 원천 사전 조회 결과는 포함했으며 실제 이틀의 플랫폼 봉인 영수증은 아직 없습니다.

## 문서 안내

- [요구사항 및 승인 범위](docs/requirements.md)
- [구현 구조와 데이터 원칙](docs/architecture.md)
- [검증 계획](docs/verification.md)
- [제출문 작성 틀](docs/submission.md)
- [구현 순서와 확장 계획](docs/roadmap.md)
- [단계별 작업 및 커밋 원칙](CONTRIBUTING.md)
- [데이터 원천과 이용 조건](docs/data-source.md)
- [공개 계약 v2와 PDF의 차이](docs/task-contract.md)

## 공식 자산 검증

Node.js 22 이상에서 별도 패키지 설치 없이 실행합니다.

```bash
node scripts/verify-task-assets.mjs
```

공식 파일 17개의 크기·SHA-256, manifest 핀, fixture 9개의 canonical hash, 35개 조건 목록, 참조 adapter의 정상·실패·복구를 검사합니다. 이것은 앱 구현이나 실제 이틀 검증의 통과를 뜻하지 않습니다.

## 실행 및 공개 상태

기술 스택을 정한 뒤 앱 설치·실행·테스트·배포 명령을 추가합니다. 현재 앱 실행 명령과 공개 심사 URL은 없습니다. [공개 소스 저장소](https://github.com/jkimsvsd-code/project-apprenticeship-04)는 연결되어 있습니다.

Open-Meteo 데이터는 출처와 CC BY 4.0을 표시하며 무료 API는 비상업 교육용으로 사용합니다. 공식 과제 자산은 원본·출처·해시를 보존합니다. 과제 자산에는 별도의 라이선스 파일이 없어 추가 권리를 임의로 부여하지 않습니다. 프로젝트 자체 라이선스는 아직 정하지 않았습니다.
