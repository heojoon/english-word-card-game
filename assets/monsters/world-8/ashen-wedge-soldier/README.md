# 월드 8 일반 몬스터 · 잿빛 쐐기병

바르가스의 명령석과 연결된 마법 갑옷 병사 디자인안. 큰 투구, 흑보라 갑옷과 은빛 테두리, 잿빛 허리 천, 가슴의 쐐기형 명령석, 짧은 창으로 구성한다. 왼쪽을 향한 SD 전신 준비 자세다.

- `source/identity-generated.png`: 생성 원본 보존.
- `monster_ashen_wedge_soldier_sd_identity.png`: 투명 배경 SD 정체성 디자인 원본.
- `generation.json`: 전체 프롬프트, 참조, 제작 도구 및 검수 상태.

사용자의 게임 연결 요청에 따라 월드 8 일반 단계(1~14·16~29)에 연결했다. 15·30단계 보스는 적용 대상에서 제외한다.

- 대기 2프레임, 창 찌르기 3프레임, 피격/완전 다운 3프레임. 창과 가로 다운 자세를 보존하도록 448×320 RGBA 셀과 앵커 (0.5, 0.975), 바닥 y=312를 사용한다.
- `ashen-wedge-soldier-sd-<action>-strip.png` 및 JSON: 여백 없는 연속 런타임 셀. `source/`는 생성 원본, `source-frames/`는 추출 포즈, `idle/`·`attack/`·`hit/`는 정규화 프레임이다.
- `review/*-spaced-50px.png`: 셀 사이가 정확히 50px인 투명 검토 시트. 생성 원본의 근사 간격은 패킹 단계에서 정확한 규격으로 맞췄다. `review/*-light-violet.png`는 밝은/Crystal Violet 배경의 모바일 크기 검토 이미지다.
- 정답의 영웅 접촉 시점에 충격 프레임이 나오며 완전 다운을 다음 문항까지 유지한다. 오답은 240ms(동작 줄이기 90ms)의 창 접촉에 HP 피해를 적용하고 같은 문제를 재시도한다.
- 일시정지 시 프레임과 접촉 예약을 함께 멈춘다. 아이스 타임은 대기와 카운트다운을 멈추고 답안 선택 시 해제한다. 전투 종료·시간 초과·다른 전투 진입 후 예약 콜백은 무효화한다.

재패킹: `python scripts/assemble-world8-wedge-soldier.py`. 검증: `npm test`, `npm run build`, `node scripts/review-world-eight-monster.mjs`(로컬 서버 필요). `review/browser-validation.json`과 모바일 스크린샷에 브라우저 검수 결과를 저장한다. 제작 도구는 내장 image_gen이며 전체 프롬프트는 `animation-contract.json`에 기록했다.
