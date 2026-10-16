# World 5 · 이성을 잃은 소서러스

전투 애니메이션 제작용 SD 기준 캐릭터. 기존 입장 일러스트의 갈색 머리,
파란 눈, 청백색 로브, 금색 장식, 지팡이와 손목의 보라색 마력을 유지한다.
적 위치에서 플레이어를 바라보는 왼쪽 방향이다.

- `source/sorcerus-sd-identity-master.png`: 생성된 SD 기준 원화
- `char_sorcerus_sd_identity.png`: 320 × 320 투명 PNG 기준 프레임
- `review/identity-review.png`: 밝은 배경·크리스털 바이올렛 및 128px 비교
- `generation.json`: 전체 프롬프트, 참조, 생성 방법과 검토 기록
- `animation-contract.json`: 대기·아이스 타임·힐링·피격/쓰러짐 규격
- `char_sorcerus_sd_*_strip.png` / `.json`: 동작별 투명 PNG 스트립과 타이밍·이벤트
- `review/animations.html`: 동작 선택, 속도 변경, 일시정지, 프레임 탐색 미리보기
- `review/*-preview.webp`: 동작별 애니메이션 미리보기
- `review/*-review.png`: 밝은 배경·바이올렛 배경의 프레임 비교
- `review/*-spaced-master.png`: 프레임 사이 정확히 50px 투명 간격을 둔 검토 원본
- `animation-prompts.json`: 내장 image_gen의 전체 동작별 프롬프트와 출력 경로
- `animation-generation.json`: 채택·제외 원본과 검토 결과

대기 2프레임(320×320), 아이스 타임 4프레임(384×320), 힐링 3프레임
(320×320), 피격·쓰러짐 3프레임(448×320)으로 총 12프레임이다.
아이스 타임과 쓰러짐은 캐릭터 크기를 줄이지 않고 칸 너비를 넓혀 효과와 지팡이를 보존했다.
시전과 힐링의 마지막 프레임은 접촉·광휘 포즈를 유지하는 명시적인 홀드다.
피격의 마지막 프레임은 완전히 쓰러진 상태이며 다음 상태로 전환할 때까지 유지한다.

기존 SD 원화와 동작별 자산의 프레임 기술 검토를 완료했다.
월드 5 10단계 전투에 네 동작을 연결했다. 시전 접촉 프레임에 얼음과 회복이 적용되며,
일시정지·축소 모션·마지막 쓰러짐 유지를 포함해 320/390/1280px 브라우저 검증을 완료했다.
세부 검증 기록은 `review/runtime-review.json`을 참조한다.

재조립: `python assets/monsters/sorcerus/source/assemble_animations.py`

기술 검사: `python assets/monsters/sorcerus/source/verify_animations.py`
