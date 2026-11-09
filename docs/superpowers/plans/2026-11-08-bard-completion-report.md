# 은유시인 최종 결과

완료일:2026-11-10. 커밋·push·프런트엔드 배포 없음.

- 남녀 비SD 프로필 및 SD idle2/attack6/hit3, 공유 음표 projectile6을 제작·연결했다. source/review와 runtime을 분리했고 JSON 계약·정확한50px 검수 간격·투명도·앵커·접촉 이벤트를 보존했다.
- 초기값과 성장 계수는 스나이퍼와 동일하며 공통 EXP 곡선을 사용한다.
- 스토리 패시브 이어지는 선율: 실제 정답 누적5회마다 MP1 회복, 상한 초과·중복 지급 없음.
- 스토리 액티브 치유의 아리아: 생성 시부터 MP1로 HP2 회복. 풀HP·사망·일시정지·종료·입력 잠금 중 거부, 활력 저장 반영.
- 운영 DB에 bard 생성 허용과 바르가스 legacy 해금 분리 마이그레이션을 적용했다. 인증·추가권·소유권·기존 스나이퍼 해금·재도전 보상을 rollback SQL로 검증했다. 자세한 운영 증거는 backend report 참조.
- 최종 `npm test`:203/203 통과. `python scripts/verify-bard-assets.py`:7/7 통과. `node scripts/verify-bard-browser.mjs`:실제 로컬 Survival 남녀2건,320/390px·남녀·normal/reduced CSS8조합,실제 CSS 재생 시간/상태 보존 통과. 로컬404/pageerror0. 전용 보스 브라우저 플레이는 미실행.
- `npm run build`:exit0, Capacitor dist 생성 완료. Source/dist JS·CSS·HTML 해시 일치,7 runtime PNG·2 프로필 포함,원본·검수·개별 추출 프레임 제외 확인. `git diff --check` 통과.
- 기존 작업 트리의 story-novel,월드9 소스,기존 스킬 아이콘 등 관련 없는 변경은 보존했다.

미리보기:`assets/characters/bard/review/preview.html`,합성 애니메이션:`battle-timeline-{male,female}-390-normal.webp`,실제 전투 캡처:`actual-{male,female}-contact.png`.
