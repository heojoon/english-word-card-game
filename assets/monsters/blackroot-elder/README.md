# 월드 8 · 15단계 중간보스 검은뿌리 거목

기존 `assets/novel/characters/char_blackroot_elder_world8_standing.webp`를 외형 기준으로 제작한 SD 전투 에셋이다. 원본 스탠딩 CG는 변경하지 않았다.

## 제작 범위

| 동작 | 프레임 | 타이밍 | 계약 |
| --- | --- | --- | --- |
| idle | ready → sway → settle | 400/400/400ms | 반복 |
| attack | ready → branch-windup → branch-contact | 250/300/350ms | 550ms 접촉 |
| hit | notice → strongest-recoil → complete-knockdown | 140/180/700ms | 일반 피격은 2번째까지, 패배 시 3번째 유지 |
| roots | wedge-charge → roots-rise → roots-contact | 300/300/400ms | 600ms 접촉 |
| guard | gather-branches → bark-shield → shield-hold | 250/250/500ms | 마지막 방어 자세 유지 가능 |

전부 왼쪽을 향하는 RGBA PNG 가로 스트립이다. 기본 셀 384×384, 공격만 448×384, 앵커 `(0.5, 0.975)`이다. 스트립에는 프레임 사이 간격이 없다. JSON의 프레임 인덱스는 0부터 시작한다. 이미지 픽셀 지면선은 y=374이며 런타임 앵커는 정규화 값이다.

월드 8의 15단계에 `blackroot-elder-boss.js`로 연결했다. Type C 40문항·120초와 공용 보상을 유지한다. 별도 HP 소진형으로 변경하지 않는다. 오답 가지 내려찍기는 접촉 시 HP 1 피해, 뿌리 솟구치기는 20초마다 접촉 시 독립 30% 확률로 HP 1 피해, 나무껍질 방벽은 30초마다 보기 위치만 재배열한다. 기존 조우·승리 원고와 보스 BGM을 사용한다. 상세 계약은 루트 `GAME_DESIGN.md`에 기록했다.

## 파일과 재생

배포에는 런타임 PNG/JSON, 이 설명서와 애니메이션 계약만 포함한다. 아래 생성 원본·분리 프레임·정규화 프레임·검수물·생성 명세·조립 스크립트는 로컬 제작 폴더에 별도 보관하며 배포 커밋에는 포함하지 않는다.

- `source/`: 생성 원본. 첫 대기 시트는 여백 부족, 첫 공격 시트의 2~3번째는 겹침으로 제외했다. 공격 첫 프레임만 분리 가능한 원본을 사용했다.
- `source-frames/<action>/`: 분리 프레임. `*-master-50px.png`는 50px 투명 간격으로 다시 배치한 원본 검수 시트다.
- `<action>/`: 정규화한 프레임.
- `monster_blackroot_elder_sd_*_strip.png/json`: 런타임용 스트립과 메타데이터.
- `review/`: 밝은 배경·Crystal Violet 검수물, 128px 프레임 그리드, WebP 미리보기, 검증 결과.
- `review.html`: 동작/프레임/배경을 선택하는 독립 검수 화면.
- `generation.json`: 도구, 전체 프롬프트, 참조와 검수 상태.

재생 시 프레임별 JSON 시간을 사용한다. CSS로 첫 슬롯에서 마지막 슬롯까지 재생하면 `background-size: 300% 100%`, `steps(2, end)`를 사용한다. 일반 피격은 knockdown까지 재생하지 않으며, 패배는 마지막 자세를 유지한다. 공격과 뿌리 효과의 피해는 접촉 프레임에 연결한다. 실제 전투 적용 시 공용 액티브·펫 효과와 아이스 타임을 보존하고 모션 감소 및 접촉 동기화를 검증해야 한다.

재생성 없이 다시 조립: `python scripts/assemble-blackroot-elder.py` (Pillow 필요).

## 검수 상태

15프레임의 RGBA/투명 여백/셀 경계와 50px 간격을 검사하고, 밝은 배경·보라색 배경의 모바일 크기 합성본을 육안 확인했다. 원본 이미지 생성기의 간격은 정확한 50px이 아니므로 원본을 직접 재생하지 않는다. 분리 후 정확한 50px 간격으로 재배치한 master가 검수 기준이다. 거의 보이지 않는 alpha≤16 노이즈만 제거했으며 색상 키 제거는 하지 않았다.

Node 회귀 검사와 `npm run build`를 통과했다. 브라우저·인게임·사용자 시각 승인 검수는 미실행이다. 생성 원본·분리 원본·검수물은 Android 패키지에서 제외한다.
