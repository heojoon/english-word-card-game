# 보랏빛 결정 궁수 전투 애니메이션

- 정확한 대상: `ranger` / `female` / `ranger_violet_crystal_skin`.
- 외형 기준: `assets/avatars/skins/ranger-female-violet-crystal.webp`. 기존 프로필·상점 일러스트는 유지한다.
- 생성 도구: built-in `image_gen`. 전체 프롬프트와 기준 이미지는 `source/generation-prompts.json`, `source/isolated-prompts.json`, `source/final-recoil-prompt.json`에 기록했다.
- SD 기준 캐릭터: `source/identity-master.png`. 개별 생성 원본 → `source-frames/` 추출본 → `attack/`, `hit/`, `projectile/` 런타임 셀 → 루트 PNG 스트립을 구분한다.
- 캐릭터 셀은 긴 활·트윈테일·쓰러진 자세를 같은 크기로 보존하기 위해 480×320으로 확장했다. 화살 셀은 320×320이다. RGBA 알파를 보존하며 흰색/보라색 색상 키 제거는 사용하지 않는다.
- 공격 첫 프레임이 대기 자세다. 게임의 공통 호흡 모션을 사용한다. 공격 6번은 공격 마무리 자세이며, 피격 3번은 완전한 쓰러짐으로 상태 전환까지 유지한다.
- 일반 발사 570ms → 화살 접촉 840ms. 모션 감소 발사 190ms → 접촉 310ms. 접촉에 피해·몬스터 반응·크리스털·햅틱을 맞춘다.
- 넓은 원본 시트는 프레임 경계·잘림 문제로 채택하지 않았다. 피격 배경 잔상 원본과 실패한 제거본도 채택하지 않았다. 최종 캐릭터는 개별 포즈에서 조립했다.
- 화살 생성 원본의 간격은 일정하지 않다. 실제 크기(2172×724)를 기준으로 효과를 개별 추출하고, 검수용 시트에 정확히 50px 투명 간격을 넣었다. 런타임 시트에는 간격이 없다.
- 검수: 각 프레임 안전 여백, 실제 알파, 밝은색/Crystal Violet 배경, 전체 순서, 모바일 브라우저 360/390/430px, 모션 감소, 최종 쓰러짐 유지, 스킨 장착·해제·재장착, 남성 기본 애니메이션 유지. 브라우저 결과는 `review/browser-validation.json`에 기록한다.
- 기술 검수 통과는 사용자 미술 승인을 뜻하지 않는다. 배포는 수행하지 않았다.

미리보기: `review/animation-preview.html`. 재조립: `python scripts/assemble-ranger-violet-sprites.py`. 로컬 서버 실행 후 브라우저 확인: `node scripts/verify-ranger-violet-sprites.mjs`.
