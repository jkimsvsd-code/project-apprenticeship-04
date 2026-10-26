# 원천 사전 조회

2026-10-26 실제 Open-Meteo 호출 결과를 원천 선정 근거로 보관합니다. 사용자의 위치가 아닌 서울 고정 대표 좌표를 요청했습니다.

- [raw-response.json](raw-response.json): 원천 HTTP 응답 본문 그대로
- [probe.json](probe.json): 공개 요청 URL·조회 시각·응답 해시·정규화 매핑 예시

이 조회는 **원천 사전 시험**입니다. 아직 앱 영속 저장·공개 화면·플랫폼 봉인 영수증과 연결하지 않았으므로 과제의 실제 이틀 증거 또는 첫날 완료로 계산하지 않습니다. `probe.json`의 reading은 필드 매핑 예시이며 실제 앱 일별 저장 행이 아닙니다.

기온은 Open-Meteo의 모델 기반 값입니다. Weather data by [Open-Meteo.com](https://open-meteo.com/) ([CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)). 데이터 원문을 보존하고 별도 파일에 정규화 매핑을 작성했습니다.
