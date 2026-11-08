# 월드 9 · 수련 목각병

사용자가 선택한 1안의 기본형(1~14단계)·상급형(16~29단계). 15·30단계 보스 제외.

2026-11-08 사용자 요청으로 기본형은 **흰띠**, 상급형은 **빨간띠**로 수정했다. 모든 대기·공격·피격/다운 프레임과 런타임 시트에 반영했다. 이전 보라띠 원본은 `source/*-purple-belt-original.png`에 보존하며, 편집 프롬프트와 참조는 `belt-edit-2026-11-08.json`에 기록한다.

- `source/`: built-in image_gen 생성 원본. 전체 프롬프트와 참조는 `generation.json`.
- `basic/`, `advanced/`: 각 외형의 `identity.png`, 런타임 스트립·JSON.
- 각 외형의 `source-frames/`: 개별 추출 원본, `idle/`·`attack/`·`hit/`: 정규화 프레임.
- 각 외형의 `review/`: 정확히 50px 간격을 둔 시트, 흰색/보라색 합성, 애니메이션 WebP.
- `animation-contract.json`: 동작·접촉·앵커·적용 범위. `review-validation.json`: 실제 원본 추출 위치와 배율.

재조립: `python scripts/assemble-world-nine-training-dummy.py`.
회귀 검증: `node --test scripts/verify-world-nine-monster.mjs`.

생성 원본은 요청한 1540px·50px 간격 대신 1254px 시트를 반환했다. 분리된 8개 실루엣을 개별 추출하고 공통 배율로 정규화했으며, 검수 시트에서 정확한 간격을 재구성했다. 원본을 수정하거나 흰 수련복의 알파를 지우지 않았다.

기술 검수: 모든 프레임을 밝은 배경·Crystal Violet 배경에서 확인. 접촉·일시정지·전환 테스트 및 전체 빌드로 확인한다. 브라우저 검수는 사용자 요청이 없어 실행하지 않았다. 기술 검수를 사용자 미술 승인으로 표시하지 않는다. 네이티브 빌드에는 생성 원본·개별 작업 프레임·검수 자료를 포함하지 않는다.
