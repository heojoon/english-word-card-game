# 월드 5 전투 배경

내장 `image_gen`으로 각각 생성한 가로형 전투 배경입니다. 기존 월드 5 시나리오 배경을 화풍·장소 참고 이미지로 첨부했습니다.

| 파일 | 적용 단계 | 장소 |
|---|---|---|
| `01-crystal-spider-cavern-battle.webp` | 1–9, 11–19 | 거미줄이 있는 수정 동굴 |
| `02-sorcerus-midboss-battle.webp` | 10 | 갈라진 봉인과 보랏빛 마력의 소서러스 전투장 |
| `03-lich-dragon-final-battle.webp` | 20 | 거대 수정·폭포·지하 호수 앞 리치 드래곤 전투장 |

PNG 원본은 `source/`, 전체 프롬프트·참고 이미지·해상도·검토 상태는 [generation.json](generation.json)에 보관합니다. 런타임은 WebP를 사용합니다.

`crystal-game.js`의 `storyBattleBackgroundClass()`와 `crystal-game.css`의 `world-five-*` 규칙으로 연결합니다. 캐릭터와 효과는 별도 레이어로 표시합니다. 이미지의 구도와 학습용 게임에 맞는 표현을 시각적으로 확인했고, 브라우저 검증과 사용자 승인은 진행하지 않았습니다.
