# 오늘의 진짜 정보판

외부 데이터 조회가 실패해도 마지막 정상값을 보존하고, 값의 출처·시각·실패 이유를 설명하는 과제 4 프로젝트입니다.

현재는 **8A: 제출문 초안 작성**까지 완료했습니다. Next.js 16.4.3·React 19.3.1·TypeScript·Node.js 24와 Neon Postgres를 사용합니다. 원천은 Open-Meteo의 서울 고정 지점 모델 기반 기온입니다. 실제 기록이 한 날짜뿐이면 비교 부족을 안내하며, 실제 이틀 영수증 검증은 마지막에 진행합니다. [제출문 초안](docs/submission.md)에 확인법 4줄·판단 기록 3줄·공개 주소와 미완료 항목을 정리했습니다. 다음은 7B 실제 이틀·영수증 대조입니다.

[기본 정보판 열기](https://project-apprenticeship-04.vercel.app) · [실패·복구 패널 열기](https://project-apprenticeship-04.vercel.app/#simulation) · 최종 제출 전 기능을 구현 중인 화면입니다.

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
├── AGENTS.md                 # 설치 버전의 Next.js 문서 확인 지침
├── .gitignore
├── .env.example              # 비밀값 없는 서버 변수 이름
├── package.json
├── package-lock.json
├── db/migrations/            # 버전별 Postgres 스키마
├── config/
│   └── live-source.json      # 고정 공개 원천·단위·필드 매핑
├── scripts/
│   ├── migrate.mjs           # 버전·해시를 기록하는 DB migration
│   ├── setup-runtime-role.mjs # 삭제 권한 없는 앱 역할 준비
│   ├── verify-task-assets.mjs # 공식 해시·참조 상태 전이 검사
│   └── audit-public-release.mjs # 고정 공개 URL·Git·배포 자산 보안 점검
├── docs/
│   ├── requirements.md       # 과제 기준과 승인된 UX 범위
│   ├── architecture.md       # 모듈 책임·저장·오류·시각 처리
│   ├── verification.md       # 실제 조회 및 합성 시험 확인 절차
│   ├── security-review.md    # 공개 접근·보안 점검 범위와 한계
│   ├── simulation.md         # 합성 재생 조작·격리·판정 안내
│   ├── submission.md         # 확인법·판단·주소·미완료 항목을 담은 초안
│   ├── data-source.md        # 원천 선택·시각·이용 조건
│   ├── task-contract.md      # 공개 계약 v2와 PDF 대조
│   ├── stack-and-storage.md  # 기술 스택·영속 저장 결정
│   ├── setup.md              # 실제 연결 전제와 실행 순서
│   └── roadmap.md            # 구현 순서와 후속 확장
├── src/
│   ├── README.md
│   ├── app/                  # 페이지·레이아웃·조회 API 진입점
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
    ├── implementation/       # 기본 화면·개발 DB 종단 검증
    ├── synthetic/            # 공식 해시·참조 adapter 검증 결과
    └── security/             # 무인증 접근·비밀값·의존성 검사
```

아직 구현하지 않은 폴더는 `.gitkeep`으로 보존합니다. 공식 자산·원천 사전 조회·기본 기능 검증 자료를 포함했으며 실제 이틀의 플랫폼 봉인 영수증은 아직 없습니다.

## 실행

Node.js 24와 npm이 필요합니다. 먼저 [실제 연결 준비](docs/setup.md)에 따라 본인 Vercel 프로젝트와 실제 Neon 개발 DB 환경변수를 준비합니다. 비밀값을 채운 파일을 Git에 추가하지 않습니다.

```bash
nvm use
npm ci
npm run db:migrate
# 새 DB를 처음 준비하는 경우에만 앱 전용 역할을 생성합니다.
node scripts/setup-runtime-role.mjs .env.local
npm run dev
```

사용자가 승인한 실행 순서는 **6단계 기능·UX → 7A 공개 배포 점검 → 8A 제출문 초안 → 마지막 실제 이틀·영수증 대조와 제출문 확정**입니다. [진행 계획](docs/roadmap.md)을 따릅니다.

`http://127.0.0.1:3000`에서 '첫 기온 불러오기' 또는 '지금 기온 새로고침'을 누릅니다. 성공한 값·단위·출처·두 시각·KST 시간대와 일별 저장값을 확인할 수 있습니다. DB나 원천에 연결되지 않으면 원인을 안내하며 가짜 값으로 대체하지 않습니다.

합성 패널은 **정상 기준값 105 준비 → 실패 한 종류 선택 → 다시 시도 · 합성 D2 복구** 순서로 확인합니다. 실패 시 105pt·1건이 보존되고 복구 시 120pt·2건·정상이 됩니다. 합성 초기화는 이 창의 시험 상태만 지웁니다. 실제 원천 호출·실제 기록 저장은 하지 않습니다. [자세한 재생 안내](docs/simulation.md)를 확인하세요.

앱 서버에는 `APP_DATABASE_URL`, 로컬 migration에는 `DATABASE_URL_UNPOOLED`가 필요합니다. 앱 전용 역할은 삭제 권한이 없습니다. 최초 역할 생성 후에는 `APP_DATABASE_URL`도 해당 Vercel 환경에 등록합니다. 구체적인 권한과 환경 분리는 [DB 안내](db/README.md)를 확인합니다.

## 검사

```bash
npm run typecheck
npm run lint
npm test
npm run test:db
npm run verify:assets
npm run build
```

`test:db`는 실제 개발 DB에 합성 시험 신호만 생성·정리합니다. 운영 DB를 사용하지 않습니다. 현재 단위 63개·개발 DB 통합 6개, 공식 fixture 9개의 앱 상태 전이, 브라우저의 실제 조회·대기·합성 재생·계산 상세를 확인했습니다. 320·390px에서 페이지 가로 넘침이 없고, 키보드 바로가기·조작·초점을 확인했습니다. 브라우저 검사는 CUA로 수행했으며 별도 Playwright 자동 시나리오는 아직 작성하지 않았습니다. [6단계 검증 결과](evidence/implementation/stage6.json)에 범위를 기록했습니다.

## 문서 안내

- [요구사항 및 승인 범위](docs/requirements.md)
- [구현 구조와 데이터 원칙](docs/architecture.md)
- [검증 계획](docs/verification.md)
- [공개 접근·보안 점검](docs/security-review.md)
- [합성 실패·복구 재생 안내](docs/simulation.md)
- [제출문 초안](docs/submission.md)
- [구현 순서와 확장 계획](docs/roadmap.md)
- [단계별 작업 및 커밋 원칙](CONTRIBUTING.md)
- [데이터 원천과 이용 조건](docs/data-source.md)
- [공개 계약 v2와 PDF의 차이](docs/task-contract.md)
- [기술 스택과 저장 방식](docs/stack-and-storage.md)
- [실제 연결 준비](docs/setup.md)

## 공식 자산 검증

Node.js 22 이상에서 별도 패키지 설치 없이 실행합니다.

```bash
node scripts/verify-task-assets.mjs
```

공식 파일 17개의 크기·SHA-256, manifest 핀, fixture 9개의 canonical hash, 35개 조건 목록, 참조 adapter의 정상·실패·복구를 검사합니다. 이것은 앱 구현이나 실제 이틀 검증의 통과를 뜻하지 않습니다.

## 실행 및 공개 상태

Vercel 프로젝트와 GitHub가 연결되어 있으며 Development/Preview와 Production은 서로 다른 Neon DB를 사용합니다. 기본 화면의 로컬 종단 흐름은 확인했습니다. 공개 배포의 최종 무인증 점검과 제출용 이틀 검증은 7단계에 수행합니다. [공개 소스 저장소](https://github.com/jkimsvsd-code/project-apprenticeship-04)는 연결되어 있습니다.

4단계 코드의 Vercel 빌드가 Ready이며, 배포 화면·읽기 API의 무로그인 HTTP 200과 운영 첫 조회·재접속 보존을 확인했습니다. [운영 검증 자료](evidence/implementation/production-first-reading.json)는 실제 한 날짜의 기록입니다. 플랫폼 봉인 영수증은 0건이므로 실제 이틀 검증 완료가 아닙니다.

5단계 코드도 운영 배포 Ready이며, 공개 패널에서 실패 5종별 105pt·1건 보존 → 120pt·2건·정상 복구를 확인했습니다. [5단계 운영 검증](evidence/implementation/stage5-production.json)에 코드 commit·무로그인 접근·실제 운영 기록 불변 대조를 기록했습니다.

Open-Meteo 데이터는 출처와 CC BY 4.0을 표시하며 무료 API는 비상업 교육용으로 사용합니다. 공식 과제 자산은 원본·출처·해시를 보존합니다. 과제 자산에는 별도의 라이선스 파일이 없어 추가 권리를 임의로 부여하지 않습니다. 프로젝트 자체 라이선스는 아직 정하지 않았습니다.

7A에서 결과물·커밋 고정 소스의 쿠키 없는 HTTP 접근과 사용자의 새 시크릿 창 접근을 확인했습니다. 실제 운영 조회·공통 재시도 제한, API 입력 거절, 비공개 파일 차단, Git 기록·빌드·공개 응답의 비밀값 검사와 npm 전체 의존성 검사도 통과했습니다. [7A 보고서](evidence/implementation/stage7a.json)와 [검사 범위](docs/security-review.md)를 확인하세요.
