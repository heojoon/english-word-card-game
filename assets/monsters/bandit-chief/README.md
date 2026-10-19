# 도적 대장 · 검정 외투 SD

월드 6B 보스 전용 자산. 비전투 원화는 `../../novel/characters/char_bandit_chief_world6b_black_coat_design.png`이며, 전투에서만 이 SD를 사용한다. 원화의 검정 외투/털 장식, 짙은 갈색 머리, 수염, 동전 장식과 큰 도끼를 유지한다.

- `source/`: image_gen 생성 원본, 전체 프롬프트와 추출 좌표. 원본의 alpha를 보존하고 색상 키로 제거하지 않는다.
- `source-frames/`: 손실 없이 분리한 전체 포즈.
- `idle/`, `attack/`, `dodge/`, `hit/`, `projectile/`: 정규화된 RGBA 런타임 프레임.
- `char_bandit_chief_sd_*_strip.png/json`: 공백 없는 가로 스트립과 프레임별 타이밍/이벤트 계약.
- `review/*-spaced-master.png`: 프레임 사이 정확히 50px의 투명 간격을 둔 보관본.
- `review/*-light.png`, `*-violet.png`, `*-mobile.png`: 밝은/보라색 배경 및 모바일 크기 검수본.
- `review/*-preview.webp`, `review/animations.html`: 애니메이션 재생본과 프레임/투척 레이어 미리보기.

캐릭터 셀은 448 × 320px이며 앵커는 (0.5, 0.975), 왼쪽을 바라본다. 도끼/팔/쓰러짐을 수용하기 위해 기본 320px보다 폭을 넓혔다. 도끼는 별도 320 × 320px 중심 앵커 이미지로 회전·이동한다. 대기는 3프레임(원화 포즈 → 눈감고 호흡 → 원화 포즈), 투척은 6프레임, 회피와 피격은 각각 3프레임이다.

게임은 경과 시간에 따라 정수 프레임을 직접 선택한다. CSS에서 중복 애니메이션을 재시작하지 않으므로 렌더/일시정지/시간정지에 프레임과 도끼 위치가 보존된다. 손을 뻗은 투척 마지막 포즈는 도끼가 접촉할 때까지 유지한다. 5초 발사 직전 320ms 동안 준비하고, 발사 뒤 600ms에 기존 50% 피해 판정을 유지한다. 모션 감소는 반응·준비·비행 시간을 절반으로 줄인다.

일반 피격은 충격 포즈로 반응한다. HP 0에서는 충격 → 완전 쓰러짐으로 전환한 뒤 결과 전환 전까지 마지막 프레임을 유지한다. 미리보기에서는 세 프레임 전체를 확인할 수 있다.

재조립: `node scripts/assemble-bandit-chief-sprites.mjs` (FFmpeg/ffprobe 필요). 규칙 및 자산 검증: `node --test tests/bandit-chief-boss.test.mjs tests/bandit-chief-sprites.test.mjs`.

브라우저 검증은 요청되지 않아 실행하지 않았다. 기술/정적 검수 결과를 사용자 승인으로 간주하지 않는다. 여러 포즈를 한 번에 생성한 시트는 간격/무기 경계 품질이 부족하여 개별 생성으로 전환했다. 원본은 보존하며, 완전히 분리된 중앙 recoil 포즈만 기존 시트에서 채택했다.
