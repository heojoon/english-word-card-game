# 은유시인 브라우저 검수

- Chromium headless, local dev server, account/backend writes 없음. 요청된 SD 스킬의 필수 in-engine 검수를 일반 전투에서 수행했다. 보스 전용 브라우저 검수는 하지 않았다.
- `node scripts/verify-bard-browser.mjs`: 남녀 실제 로컬 데모 Survival의 idle/공격/음표 접촉, 320/390px × 남녀 × 일반/동작 줄이기 검수 화면 8조합 통과. 발사 전 숨김, 접촉 프레임, 마지막 다운 유지, idle 복귀, 일시정지 확인. 로컬 404 및 pageerror 0.
- 검수 페이지에서 custom-property URL의 상대 경로가 외부 CSS 기준으로 해석되어 발생한 404를 발견했다. document URL로 절대 경로를 계산하도록 수정 후 동일 검사 전체 통과. 실제 production 경로는 정상이다.
- `assets/characters/bard/review/browser-review.json`에 결과, 같은 폴더 `actual-{male,female}-contact.png`에 실제 전투 캡처를 보관했다. 전체 검수 캡처는 `output/playwright/bard/`에 있다.
- 작은 전투 크기에서도 하프·연주 손·음표·다운이 명료하고 학습 영역을 침범하지 않는다.
- 최종 재실행에서 production `replaceScreenMarkup`을 실제 Chromium DOM에 적용해 paused650ms/running300ms/finished650ms의 시간과 재생 상태가 화면 갱신 뒤에도 유지되는 것을 확인했다. 오류0.
- 이는 기술 검수이며 사용자 최종 시각 승인이나 production 배포를 뜻하지 않는다.
