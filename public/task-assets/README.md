# 공식 합성 자산 보관 위치

`t04/`에는 2026-10-26 공식 HTTPS 링크에서 확보한 공개 교육용 합성 검사 자산 원본 18개를 보관합니다. manifest에 열거된 파일 17개의 크기·SHA-256과 fixture 9개의 canonical hash를 확인했습니다. 자체 fixture나 계약 파일로 대체하지 않습니다.

과제 PDF에 기재된 공개 링크:

- [공식 ZIP](https://aleph-omega.vercel.app/assets/studio-task-assets/t04-real-information-board/t04-real-information-board-public-v1.zip)
- [사용법 README](https://aleph-omega.vercel.app/assets/studio-task-assets/t04-real-information-board/README.md)
- [공개 판정 계약](https://aleph-omega.vercel.app/assets/studio-task-assets/t04-real-information-board/public-contract.json)
- [자산 SHA-256 목록](https://aleph-omega.vercel.app/assets/studio-task-assets/t04-real-information-board/asset-manifest.json)

공개 계약은 `2.0.0`, fixture 계약은 `1.1.0`, package ID는 `aleph-t04-real-information-board-public-contract-v2`입니다. ZIP의 파일명은 v1이므로 내부 계약 버전과 구분합니다. 상세 결과는 [검증 보고서](../../evidence/synthetic/asset-verification.json), 변경사항은 [계약 대조 문서](../../docs/task-contract.md)에 있습니다.

README는 자료를 모든 학생에게 제공하는 공개 합성 fixture 꾸러미로 설명합니다. 꾸러미에는 LICENSE 파일이나 별도의 명시적 재라이선스 조항이 없습니다. 원본·출처를 보존하며 프로젝트 자체 라이선스로 재라이선스하지 않습니다.

재검증: 저장소 루트에서 `node scripts/verify-task-assets.mjs`. manifest 자체의 해시는 스크립트에 핀으로 기록했습니다. 참조 adapter 검사는 앱 구현의 통과 판정이 아닙니다.

이 경로는 공개 정적 자산이 될 수 있으므로 비밀값·실제 개인정보·개인 기록을 넣지 않습니다.
