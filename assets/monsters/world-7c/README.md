# 월드 7C · 고대 마도 파수병

대성당 지하의 고대 마법 갑옷 병기. 상아색/은빛 갑옷, 절제된 황동 테두리, 청록색 마력핵과 눈, 보라색 천, 짧은 검과 원형 방패를 사용한다. 일반 단계 1~9·11~29용이며 10·30단계 보스와 구분한다. 이름과 디자인은 이번 제작안이며 사용자 승인으로 간주하지 않는다.

- `source/identity.png`: 기본 정체성 원본. `source/*-generated.png`: 생성 원본 보존.
- `source-frames/<action>/`: 투명 알파 연결요소로 분리한 포즈. 색상 키 제거를 사용하지 않는다.
- `idle/`, `attack/`, `hit/`: 정규화한 개별 프레임.
- `arcane-sentry-sd-<action>-strip.png` 및 JSON: 448×320 RGBA 연속 셀, 왼쪽 방향, 앵커 (0.5, 0.975), 바닥 y=312.
- 대기 2프레임(600/600ms), 공격 3프레임(120/120/260ms, 240ms에 접촉), 피격 3프레임(100/100/160ms). 피격 마지막은 완전 다운이며 상태 전환까지 유지한다.
- `source/*-master-50px.png`, `review/*-spaced-50px.png`: 정확히 50px의 투명 셀 간격. 생성 원본의 간격은 근사치였으며 패킹 단계에서 규격을 맞췄다.
- `review/index.html`: 배경 합성, 동작 선택/재시작, 정지, 밝은/보라색 배경, 동작 줄이기 미리보기.
- `review/*-light-violet.png`, `review/battle-composite.jpg`, `review/validation.json`: 오프라인 검수 결과.

재생성 패킹: `python scripts/assemble-world7c-sentry.py` (Pillow, NumPy 필요).
전체 프롬프트와 참조는 `generation.json`에 기록했다. 내장 image_gen으로 제작했다.

현재 7C의 공유 연결형 전투 런타임에 연결했다. 10·30단계도 전용 보스 구현 전까지 같은 파수병을 사용한다. 정답 접촉·오답 공격·다운 유지·일시정지·아이스 타임·동작 줄이기를 기존 Story 몹 재생기로 처리한다. 밝은 배경/Crystal Violet 배경의 프레임과 합성 구도, 투명도, 경계를 오프라인으로 검수했다. 브라우저 검수는 요청하지 않아 수행하지 않았다.
