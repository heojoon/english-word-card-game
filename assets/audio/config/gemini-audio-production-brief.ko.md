# 제미나이 전달용: Wordoria Crystal Quest 누락 오디오 제작

점검일: 2026-10-10. 프롬프트 수정일: 2026-10-10. 필터 통과를 보장하지 않으며 음악·음향의 실제 소재를 중립적으로 기술했다. 기준: 현재 작업 폴더의 `audio-manifest.json`, 실제 파일, `crystal-game.js`, `sound-manager.js`. 생성된 오디오는 없으며 이 문서는 제작 명세다.

## 확인 결과

- 기존 파일: `assets/audio/bgm/forest/bgm_whispering_woods_sunny_side_up.mp3` (약 3.6 MB, MP3 44.1 kHz/192 kbps). 파일 형식만 확인했으며 청취·루프 품질 검수는 하지 않았다.
- 누락 BGM: 4곡 × OGG/MP3 = 런타임 파일 8개. 두 포맷은 같은 곡의 인코딩이며 별도 작곡 8곡이 아니다.
- 누락 SFX: 16종, 변형 포함 WAV 26개. 총 누락 런타임 파일 34개. WAV BGM 원본 4개는 별도 보관한다.
- 숲 BGM은 스토리 지도·대화·일반 스토리 전투에 사용된다. 일반 전투 BGM은 현재 서바이벌에 사용된다.
- 피버 풍선 삐걱/팡 효과는 Web Audio 합성으로 구현되어 파일 제작 대상이 아니다. 상자 터치·크리스털 보상·별도 클리어 차임도 코드 합성음이 있다.
- `PLAYER_JUMP`, `PLAYER_LAND`, `ITEM_ACQUIRED`는 manifest에 있으나 현재 `crystal-game.js`에서 해당 이벤트를 발행하지 않는다. 이 3개는 후순위이며 파일을 넣는 것만으로 재생되지 않는다.
- 현재 가벼운 공격은 전사·궁수·마법사가 공유한다. 직업별 전용 효과음은 향후 이벤트 분리 작업이며 아래 누락 목록에 추가하지 않았다.

## 사용 방법

제미나이에는 별도 파일 `gemini-audio-prompts-copy-only.md`의 공통 요청문과 원하는 번호의 영어 프롬프트만 전달한다. 이 문서의 이벤트 ID·런타임 파일명은 로컬 연동용 대조표다. 우선 BGM 4곡을 한 곡씩 제작하고, 그다음 전투/버튼 효과음을 만든다. 숫자 길이는 목표이며 BGM은 마디 단위의 자연스러운 루프가 우선이다. LUFS·피크·샘플레이트는 제작/후처리 목표이며 생성 모델이 보장한 측정값으로 취급하지 않는다.

## 공통 요청문 (중립적인 음향 표현으로 수정)

```text
Create original instrumental music and short interface sounds for Wordoria Crystal Quest, a cheerful vocabulary-learning game with a sparkling crystal adventure setting. Use a friendly, playful, polished sound palette that works clearly on phone speakers and leaves room for spoken English words.

Please create one numbered item at a time. Deliver an actual downloadable audio file if audio generation is available. Otherwise, provide the production prompt and clearly state that an audio file has not been generated.

Prefer a lossless WAV master at 48 kHz / 24-bit where supported. For background music, also export the same composition as OGG and MP3 when available. Use clean audio, smooth tails, consistent perceived loudness, and comfortable listening levels. Deliver each variation as a separate file. All melodies should be original. Music is instrumental; short cues use instruments, air, cloth, and crystal-like tones.
```

## BGM 4곡

### MENU_BGM — 메인 메뉴 · 캐릭터 선택 · 일반 화면

누락 런타임 파일:
- `assets/audio/bgm/menu/bgm_menu_crystal_gateway_loop.ogg`
- `assets/audio/bgm/menu/bgm_menu_crystal_gateway_loop.mp3`

```text
Create a welcoming instrumental theme with celesta, soft marimba, warm strings, airy pads, and delicate glass chimes. Mood: friendly, curious, gently magical. Energy: low to medium. Use a restrained memorable melody and a steady relaxed pulse. Duration: about 75 seconds, adjusted to complete four-bar phrases. Seamless loop: the final bar flows naturally into the first, including ambience and reverb. Begin with the repeating musical texture and maintain it through the loop boundary. Clean stereo, controlled treble and bass, phone-speaker clarity. Production target: -16 LUFS with at least 1 dB true-peak headroom.
```

### BATTLE_BGM — 일반 서바이벌 전투

누락 런타임 파일:
- `assets/audio/bgm/battle/bgm_battle_word_crystal_loop.ogg`
- `assets/audio/bgm/battle/bgm_battle_word_crystal_loop.mp3`

```text
Create an energetic instrumental loop with light hand percussion, pizzicato strings, a marimba pulse, crystal bells, and a cheerful adventure motif. Mood: playful concentration, curiosity, and forward motion. Energy: medium to high, with a steady even rhythm and uncluttered arrangement. Keep spoken vocabulary and interface cues clearly audible. Duration: about 90 seconds, adjusted to complete four-bar phrases. Seamless loop with continuous reverb and a natural final-to-first bar transition. Begin with the repeating texture and sustain the same musical flow at the loop boundary. Clean stereo, rounded transients, restrained bass, clear phone-speaker mids. Production target: -16 LUFS with at least 1 dB true-peak headroom.
```

### BOSS_BGM — 거대 로얄 슬라임 · 크리스털 수호자 · 서바이벌 마지막 문제

누락 런타임 파일:
- `assets/audio/bgm/boss/bgm_boss_crystal_guardian_loop.ogg`
- `assets/audio/bgm/boss/bgm_boss_crystal_guardian_loop.mp3`

```text
Create a lively instrumental theme for the grand finale of a cheerful crystal adventure. Use rounded toms, rhythmic strings, warm synth accents, shimmering crystal arpeggios, and airy instrumental pads. Mood: discovery, teamwork, excitement, and confidence. Energy: high yet comfortable, with a clear original melody and steady regular pulse. Keep space for spoken vocabulary and short interface cues. Duration: about 90 seconds, adjusted to complete eight-bar phrases. Seamless loop, continuous ambience, natural final-to-first transition. Begin with the repeating musical texture and keep the loop boundary musically open. Clean stereo, balanced treble, controlled bass, and clear phone-speaker midrange. Production target: -15 LUFS with at least 1 dB true-peak headroom.
```

### ENDING_BGM — 서바이벌 클리어 결과 화면의 반복 BGM

누락 런타임 파일:
- `assets/audio/bgm/ending/bgm_ending_wordoria_home_loop.ogg`
- `assets/audio/bgm/ending/bgm_ending_wordoria_home_loop.mp3`

```text
Create a warm instrumental background loop for a learning-results screen. Use soft celesta, lyrical warm strings, gentle marimba, airy pads, and delicate crystal chimes. Mood: achievement, contentment, belonging, and anticipation of the next adventure. Energy: low to medium with a gentle regular pulse. Use a simple original melody and a spacious arrangement that leaves room for short reward cues. Duration: about 75 seconds, adjusted to complete four-bar phrases. Seamless musical loop with continuous reverb tails and a natural final-to-first transition. Start with the sustained repeating texture. Clean stereo, comfortable highs and bass, clear phone-speaker playback. Production target: -16 LUFS with at least 1 dB true-peak headroom.
```

## 효과음 16종 / WAV 26개

공통 품질: 48 kHz/24-bit WAV 원본(지원 시), 클릭·DC offset·불필요한 선행 무음 제거, 최소 1 dB true-peak 여유. 짧은 반복 효과음은 mono-compatible, 보상/스킬 음악 신호는 stereo 가능. 모든 효과음은 반복하지 않는다. 공격 시작음에는 타격음을 섞지 않고 피격음은 시작 즉시 접촉을 표현한다. 접촉 지연은 런타임이 직업/스킨/모션 설정에 따라 결정하므로 WAV 앞에 420 ms 등의 무음을 넣지 않는다.

### ATTACK_LIGHT — 가벼운 공격 시작

- `assets/audio/sfx/combat/attack/sfx_combat_attack_light_01.wav`
- `assets/audio/sfx/combat/attack/sfx_combat_attack_light_02.wav`
- `assets/audio/sfx/combat/attack/sfx_combat_attack_light_03.wav`

```text
Create an original short interface sound. A quick airy sweep with a tiny violet crystal shimmer. Medium-light energy. Focus on air movement and sparkle, with one smooth gesture and a soft short tail. Duration: approximately 0.35 seconds including the tail. Clean 48 kHz audio where supported, mono-compatible with clear phone-speaker midrange, rounded transients, and comfortable listening level. Loop: no. Deliver 3 separate subtly different variations with consistent character and perceived loudness.
```

### ATTACK_HEAVY — 권투가 공격 시작

- `assets/audio/sfx/combat/attack/sfx_combat_attack_heavy_01.wav`
- `assets/audio/sfx/combat/attack/sfx_combat_attack_heavy_02.wav`

```text
Create an original short interface sound. A broad rounded cloth sweep with a low airy layer and a compact crystal shimmer. High energy, warm midrange, controlled bass. One flowing motion with a smooth short tail. Duration: approximately 0.55 seconds including the tail. Clean 48 kHz audio where supported, mono-compatible with clear phone-speaker midrange, rounded transients, and comfortable listening level. Loop: no. Deliver 2 separate subtly different variations with consistent character and perceived loudness.
```

### ATTACK_SPECIAL — 특수 공격 · 보스 빔 시작

- `assets/audio/sfx/combat/special/sfx_combat_special_crystal_01.wav`
- `assets/audio/sfx/combat/special/sfx_combat_special_crystal_02.wav`

```text
Create an original short interface sound. A rising violet-and-mint crystal shimmer, a quick airy sweep, a clear luminous accent, and a restrained sparkling tail. High energy, cheerful and polished. Keep the opening concise. Duration: approximately 1.2 seconds including the tail. Clean 48 kHz audio where supported, mono-compatible with clear phone-speaker midrange, rounded transients, and comfortable listening level. Loop: no. Deliver 2 separate subtly different variations with consistent character and perceived loudness.
```

### PLAYER_HIT — 플레이어 피격

- `assets/audio/sfx/combat/hit/sfx_combat_hit_player_01.wav`
- `assets/audio/sfx/combat/hit/sfx_combat_hit_player_02.wav`
- `assets/audio/sfx/combat/hit/sfx_combat_hit_player_03.wav`

```text
Create an original short interface sound. A soft rounded percussive accent with a lower crystal tick and a brief descending shimmer. Medium energy, gentle and neutral. Begin the accent immediately and keep the tail short. Duration: approximately 0.4 seconds including the tail. Clean 48 kHz audio where supported, mono-compatible with clear phone-speaker midrange, rounded transients, and comfortable listening level. Loop: no. Deliver 3 separate subtly different variations with consistent character and perceived loudness.
```

### ENEMY_HIT — 적 타격 접촉

- `assets/audio/sfx/combat/hit/sfx_combat_hit_enemy_01.wav`
- `assets/audio/sfx/combat/hit/sfx_combat_hit_enemy_02.wav`
- `assets/audio/sfx/combat/hit/sfx_combat_hit_enemy_03.wav`

```text
Create an original short interface sound. A rounded percussive accent layered with a bright crystal tick and tiny glittering tones. Medium-high energy, cheerful and satisfying. Brighter than item 08. Immediate onset and short clean tail. Duration: approximately 0.4 seconds including the tail. Clean 48 kHz audio where supported, mono-compatible with clear phone-speaker midrange, rounded transients, and comfortable listening level. Loop: no. Deliver 3 separate subtly different variations with consistent character and perceived loudness.
```

### CRITICAL_HIT — 크리티컬 · 스킬/피버 강조

- `assets/audio/sfx/combat/critical/sfx_combat_critical_01.wav`
- `assets/audio/sfx/combat/critical/sfx_combat_critical_02.wav`

```text
Create an original short interface sound. A rich rounded low accent, a bright crystal note, a rising shimmer, and a brief rewarding sparkle. High energy at a comfortable listening level. A clear immediate accent followed by a compact luminous tail. Duration: approximately 0.8 seconds including the tail. Clean 48 kHz audio where supported, mono-compatible with clear phone-speaker midrange, rounded transients, and comfortable listening level. Loop: no. Deliver 2 separate subtly different variations with consistent character and perceived loudness.
```

### PLAYER_JUMP — 점프 · 현재 이벤트 연결 전

- `assets/audio/sfx/character/jump/sfx_character_jump_01.wav`

```text
Create an original short interface sound. A light cloth lift with a playful airy puff. Low energy, soft and cheerful. Short clean gesture. Duration: approximately 0.25 seconds including the tail. Clean 48 kHz audio where supported, mono-compatible with clear phone-speaker midrange, rounded transients, and comfortable listening level. Loop: no. Deliver 1 separate take.
```

### PLAYER_LAND — 착지 · 현재 이벤트 연결 전

- `assets/audio/sfx/character/landing/sfx_character_land_01.wav`

```text
Create an original short interface sound. A soft rounded surface tap with a small airy puff and faint crystal tick. Low-to-medium energy. Compact onset and short smooth tail. Duration: approximately 0.3 seconds including the tail. Clean 48 kHz audio where supported, mono-compatible with clear phone-speaker midrange, rounded transients, and comfortable listening level. Loop: no. Deliver 1 separate take.
```

### PLAYER_DEATH — 플레이어 쓰러짐

- `assets/audio/sfx/character/death/sfx_character_player_death_01.wav`

```text
Create an original short interface sound. A muted rounded tap followed by fading violet shimmer and a gentle descending instrumental tone. Medium energy, calm and reassuring. Smooth resolved tail. Duration: approximately 1.1 seconds including the tail. Clean 48 kHz audio where supported, mono-compatible with clear phone-speaker midrange, rounded transients, and comfortable listening level. Loop: no. Deliver 1 separate take.
```

### ENEMY_DEATH — 적 소멸

- `assets/audio/sfx/character/death/sfx_character_enemy_death_01.wav`

```text
Create an original short interface sound. A soft rounded bubble pop that becomes sparkling crystal notes and a light airy fade. Medium energy, playful and brief, suitable for frequent small visual transitions. Duration: approximately 0.7 seconds including the tail. Clean 48 kHz audio where supported, mono-compatible with clear phone-speaker midrange, rounded transients, and comfortable listening level. Loop: no. Deliver 1 separate take.
```

### GAME_VICTORY — 승리 팡파르 · 반복 없음

- `assets/audio/sfx/system/victory/sfx_system_victory_01.wav`

```text
Create an original short interface sound. A joyful short completion jingle rising through sparkling crystal chimes, warm strings, and an uplifting original cadence. Medium-high celebratory energy. Start promptly, resolve musically, and finish with a smooth clean tail. One-shot cue. Duration: approximately 5 seconds including the tail. Clean 48 kHz audio where supported, mono-compatible with clear phone-speaker midrange, rounded transients, and comfortable listening level. Loop: no. Deliver 1 separate take.
```

### GAME_DEFEAT — 패배 · 재도전 음악 신호

- `assets/audio/sfx/system/defeat/sfx_system_defeat_01.wav`

```text
Create an original short interface sound. A gentle short fresh-start jingle with descending soft marimba, warm muted strings, and a hopeful crystal note at the end. Low-to-medium energy, encouraging and calm. Clear musical ending. One-shot cue. Duration: approximately 4 seconds including the tail. Clean 48 kHz audio where supported, mono-compatible with clear phone-speaker midrange, rounded transients, and comfortable listening level. Loop: no. Deliver 1 separate take.
```

### UI_CLICK — 일반 버튼

- `assets/audio/sfx/ui/click/sfx_ui_click_01.wav`
- `assets/audio/sfx/ui/click/sfx_ui_click_02.wav`

```text
Create an original short interface sound. A tiny polished crystal tap with a soft rounded tick. Low energy, quick and unobtrusive for frequent touchscreen presses. Very short clean tail. Duration: approximately 0.08 seconds including the tail. Clean 48 kHz audio where supported, mono-compatible with clear phone-speaker midrange, rounded transients, and comfortable listening level. Loop: no. Deliver 2 separate subtly different variations with consistent character and perceived loudness.
```

### UI_CONFIRM — 시작 · 구매 · 장착 확인

- `assets/audio/sfx/ui/confirm/sfx_ui_confirm_01.wav`

```text
Create an original short interface sound. A concise ascending two-note crystal cue with a soft warm tap underneath. Low-to-medium energy, friendly and affirmative. Compact smooth tail. Duration: approximately 0.22 seconds including the tail. Clean 48 kHz audio where supported, mono-compatible with clear phone-speaker midrange, rounded transients, and comfortable listening level. Loop: no. Deliver 1 separate take.
```

### UI_CANCEL — 닫기 · 취소

- `assets/audio/sfx/ui/cancel/sfx_ui_cancel_01.wav`

```text
Create an original short interface sound. A soft descending two-note crystal tick with a light airy release. Low energy, calm and neutral. Compact clean tail, distinct from item 18. Duration: approximately 0.18 seconds including the tail. Clean 48 kHz audio where supported, mono-compatible with clear phone-speaker midrange, rounded transients, and comfortable listening level. Loop: no. Deliver 1 separate take.
```

### ITEM_ACQUIRED — 아이템 획득 · 현재 이벤트 연결 전

- `assets/audio/sfx/system/notification/sfx_system_item_acquired_01.wav`

```text
Create an original short interface sound. A sparkling three-note crystal cue with a warm metallic bell accent and a short upward shimmer. Medium-high energy, cheerful and rewarding. Compact musically resolved tail. Duration: approximately 0.9 seconds including the tail. Clean 48 kHz audio where supported, mono-compatible with clear phone-speaker midrange, rounded transients, and comfortable listening level. Loop: no. Deliver 1 separate take.
```

## 저장 및 적용

런타임 파일은 위 경로·이름 그대로 저장한다. BGM WAV 원본은 예를 들어 `assets/audio/masters/bgm/`에 별도 보관한다. 파일 제작 후 실제 재생·루프 이음새·전투 접촉 타이밍·음성 가독성을 확인하고 `npm run build`로 Android용 dist에도 복사한다. 이 문서 작성 과정에서는 오디오 파일, manifest, 런타임 코드를 변경하지 않았다.
