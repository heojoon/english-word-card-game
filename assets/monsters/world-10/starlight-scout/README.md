# 월드 10 · 오염된 별빛 정찰병

기존 SD 외형을 유지한 일반 전투 자동병기. 본편 1~19·21~39 및 번외 1~2단계에 연결하며 20·40·번외 3단계 보스는 제외한다.

- 원본: `monster_starlight_scout_sd_identity.png`, `source/`. 생성 프롬프트: `generation.json`, `source/animation-prompts.json`.
- 계약: `animation-contract.json`. 왼쪽 방향 320×320 RGBA, 앵커 (0.5, 0.975), 바닥선 312px.
- 동작: 대기 2장, 준비→예비→주먹 접촉 3장, 알아차림→반동→완전 다운 3장. 다운 마지막 자세는 다음 문항까지 유지한다.
- 런타임: `starlight-scout-sd-{idle,attack,hit}-strip.png`와 JSON. 작업용 개별 프레임·원본·검수는 별도 보관하며 APK에서 제외한다.
- 검수: `review/`의 밝은 배경·Crystal Violet 합성, 160px 미리보기, 정확한 50px 투명 간격 시트. 생성본은 요청 규격과 다른 해상도·간격을 반환했으므로 실제 좌표로 분리하고 검수 시트에서 간격을 재구성했다.
- 서로 다른 원본 해상도는 첫 번째 서 있는 자세 높이를 기준으로 보정한다. 한 동작 안에서는 같은 배율을 사용하고 다운 자세를 별도로 키우지 않는다. 흰색 장갑과 렌즈를 색상으로 제거하지 않는다.

재조립: `python scripts/assemble-world-ten-scout.py`.
회귀 검증: `node --test scripts/verify-world-ten-monster.mjs`.
전투는 기존 Type C 문제·시간·보상, 접촉 피해·오답 재시도·일시정지·아이스 타임·모션 감소를 공유한다. 브라우저 검수는 요청 시 실행하며 기술 검수를 사용자 미술 승인으로 표시하지 않는다.
