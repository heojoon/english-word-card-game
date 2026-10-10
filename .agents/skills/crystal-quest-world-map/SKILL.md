---
name: crystal-quest-world-map
description: Generate, redraw, edit, or integrate Wordoria Crystal Quest story world-map images while preserving the chapter-1 library map's painterly style and playable waypoint layout. Use for 월드맵 and 크리스털 사원 입구 map requests in this project; not for character sprites, battle backgrounds, UI, or OCR vocabulary photos.
---

# Crystal Quest 월드맵

Wordoria 월드맵을 같은 작품군의 그림체로 생성한다. 사용자 요청에 따라 신규 지도, 기존 지도 재생성, 부분 편집 또는 게임 적용을 수행한다.

## 기준 문서 찾기

대상 저장소 루트의 `WORLD_MAP_IMAGE_GUIDE.md`를 반드시 읽는다. 이 문서가 고정 프롬프트와 검수 규칙의 단일 원본이다. `ART_DIRECTION.md`와 `GAME_DESIGN.md`의 관련 월드 설정도 확인한다.

현재 프로젝트는 `/Users/hjoon/Documents/git/english-word-card-game`이다. 다른 작업 경로에서 호출되면 이 저장소를 확인하고, 사용자가 다른 체크아웃을 지정하면 그 경로를 우선한다. 기준 문서를 찾지 못하면 저장소에서 검색하고 누락을 알린다. 관련 없는 프로젝트에 이 그림체를 자동 적용하지 않는다.

## 도구 호출 전 필수 사항

- 제공되는 `imagegen` 스킬을 읽고 도구 선택·참조 전달·저장 규칙을 따른다. 기본은 내장 이미지 생성 도구이며, CLI/API 전환은 사용자가 선택한 경우에만 한다.
- `assets/story/chapter-1-library-map.webp`를 실제로 확인하고 모든 생성 호출에 **그림체 원본**으로 포함한다. 최신 생성물만 연쇄 참조하지 않는다.
- 기존 지도가 있으면 확인하고 **레이아웃 참조**로 별도 지정한다. 원본의 도서관 건물을 새 월드에 복제하지 않고, 기존 대상 지도의 로우폴리 질감도 따르지 않는다.
- 가이드의 고정 스타일·금지 블록을 그대로 사용하고 지역·목적지·지형·비율·스테이지 계약만 별도 지정 블록에 넣는다. 이미지 첨부 순서와 프롬프트의 참조 번호를 일치시킨다.
- `crystal-game.js`에서 대상 월드의 스테이지 개수·순서·좌표를 읽는다. 정확한 크기는 이미지 메타데이터로 확인한다. 예시 월드의 7개 스테이지나 비율을 다른 월드에 강제하지 않는다.

## 결과 처리

가이드에 따라 원본과 비교하여 채색·재질·수정 수·경로 연결·잘림·모바일 가독성을 검수한다. 모델이 요청한 좌표를 정확히 지켰다고 가정하지 말고 실제 수정 중심을 측정한다.

프로젝트용 결과는 생성 원본과 런타임 WebP를 분리하여 저장한다. 기존 이미지 교체가 요청되면 이전 이미지를 보관하고 교체하며, 제안용 신규 결과는 별도 이름으로 저장한다. 가이드에 지정된 `.generation.json`을 기록한다. 모델명은 도구가 노출한 값만 기록하고 기술 검수와 사용자 승인 상태를 구분한다.

게임 적용까지 요청된 작업이면 해당 월드 참조·좌표만 변경하고 브라우저에서 모바일 지도와 버튼 정렬을 확인한 뒤 `npm run build`를 실행한다. 문서 작업에는 이미지 생성이나 게임 빌드를 추가하지 않는다. 배포는 별도 요청이 있을 때 저장소 배포 규칙에 따라 수행한다.

최종 답변에는 결과 경로, 프롬프트 기록 경로, 도구와 실제 수행한 검수를 간결하게 보고한다.
