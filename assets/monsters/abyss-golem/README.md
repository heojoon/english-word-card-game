# 심연의 골렘 — 월드 6A 중간보스 아트

스킬: `crystal-quest-sd-sprite-animation` + `imagegen`의 내장 이미지 생성 도구를 사용했다. 기존 월드 6A 일반 골렘은 렌더링·재질 참고이며, 이 보스는 온전한 양팔·왕관형 머리 암석·금테 마름모 가슴 수정·큰 발을 가진 별도 디자인이다. 사용자 승인 전의 신규 아트이며 기존 자산은 덮어쓰지 않았다.

## 파일

- `monster_abyss_golem_standing.png`: 투명 배경 전신 스탠딩 CG. 원본은 `source/standing-generated.png`에 별도 보존.
- `source/sd-identity.png`: SD 정체성 기준 프레임.
- `monster_abyss_golem_sd_<action>_strip.png`와 같은 이름의 JSON: 정사각형 셀 3개를 가로로 이어 붙인 RGBA 스트립과 재생 명세. 기본 320 × 320이며, 스매시는 들어 올린 주먹과 충격 효과를 몸 크기를 줄이지 않고 담기 위해 384 × 384다.
- 액션: `idle`, `attack`, `ground_stamping`, `bedrock_rise`, `hit`.
- `<action>/01.png`–`03.png`: 정규화 프레임. `source-frames/<action>/`에는 추출 원본 보존.
- `source-frames/*-spaced-50px.png`: 원본 해상도에서 정확히 50 px 간격으로 재조립한 소스 마스터.
- `review/*-spaced-50px.png`: 런타임 해상도 50 px 간격 리뷰 마스터. 런타임 스트립에는 간격이 없다.
- `review/*-alpha-review.png`, `review/mobile-frame-grid.png`: Moon White / Crystal Violet 배경과 모바일 크기 검토 이미지.
- `review/*-preview.webp`: 개별 모션 반복 미리보기. 다운·경화의 마지막 자세 유지 동작은 HTML 리뷰에서 확인한다.
- `review/index.html`: 로컬 개발 서버에서 여는 모션 리뷰. 실제 전투·보상 시스템과 분리된 아트 미리보기다.
- `animation-contract.json`: 사용자 제공 보스 설정과 애니메이션 계약.
- `generation.json`: 전체 생성 프롬프트·참조·도구 정보.

## 전투 연결 계약

이 작업은 스탠딩 CG와 SD 애니메이션 제작이다. 운영 전투·보상 RPC·DB는 변경하지 않는다.

- HP 200, 제한시간 300초, 보상 300 크리스털.
- 그라운드 스탬핑: 60초마다 80% 발동 확률. `crouch → airborne-foot-raised → stomp-contact`. 3번 프레임의 `hit: true`에서 피해·음향·진동·플레이어 반응을 동기화한다. 도약의 화면상 왼쪽 이동과 높이는 별도 이동 레이어에서 처리하며 발 접촉 이후 복귀한다. HP를 절반으로 감소시키며 현재 HP가 1이면 Game Over. 홀수 HP 반감의 반올림 방식은 사용자 미지정이므로 실제 연결 전에 결정한다.
- 배드락라이즈: 10초마다 발동, 공격 방어 확률 77%. `brace → darkening → black-stone-guard`. 몸의 암석은 검게 변하고 눈·수정의 발광은 유지한다. 방어 지속시간은 사용자 미지정이며 아트 재생시간을 게임플레이 지속시간으로 간주하지 않는다.
- 일반 스매시는 3번 프레임에서 접촉. 피격은 `guard-notice → strongest-recoil → complete-knockdown`이고 마지막 프레임을 전투 상태가 바뀔 때까지 유지한다.
- 모든 액션은 왼쪽을 바라보며 앵커는 `(0.5, 0.975)`다. 같은 원본 시트 내에는 하나의 공통 배율을 적용해 포즈별 자동 맞춤 축소를 피한다.
- CSS 사용 시 3프레임은 `background-size: 300% 100%`, `steps(2, end)`, 위치 `0% → 100%`. JSON에 기록된 프레임별 시간이 필요하면 리뷰 HTML처럼 프레임을 직접 선택한다.
- Reduced motion에서는 도약 거리를 줄이더라도 준비·접촉·피격의 순서를 보존한다.

## 검수

생성 원본의 실제 크기·분리 좌표·배율은 `source/layouts.json`, 런타임 알파 범위·경계·간격 검증 결과는 `review/validation.json`에 기록한다. 생성 모델의 원본 여백은 불규칙할 수 있으므로 원본을 보존한 뒤 개별 추출하여 정확한 50 px 소스/리뷰 마스터를 재조립한다.

5종 15프레임을 Moon White / Crystal Violet 배경과 모바일 크기에서 육안 검토했다. 알파·셀 경계·동일 슬롯 크기·50 px 마스터 간격을 검증했고, 피격의 마지막 프레임은 완전한 다운 자세다. 스매시와 밟기의 접촉 프레임은 이펙트 간섭 때문에 별도로 재생성했으며, 포즈별 원본·배율을 명세에 기록했다. HTML 리뷰 스크립트의 구문 검사도 통과했다. 사용자 승인·운영 전투 연결·실제 브라우저 전투 검수는 아직 수행하지 않았다.

재조립: `python scripts/assemble-abyss-golem.py` (Pillow 필요).
