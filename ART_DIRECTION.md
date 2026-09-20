# Wordoria Art Direction

> Status: **APPROVED / LOCKED**  
> Selected direction: **01 · Crystal Quest (크리스털 퀘스트)**  
> Decision date: 2026-09-10  
> Interactive reference: `art-direction.html?concept=crystal`
> Playable HTML reference: `playable-preview.html` — home, equipment, dungeon, battle, and shop with connected dummy state

This file is the canonical visual guide for new sessions and future implementation. If an older document or prototype conflicts with this guide, this guide wins for visual decisions.

## 1. Creative North Star

**Bright, polished casual fantasy where learning information is clear and every reward sparkles like a recovered Word Crystal.**

The player should feel clever, capable, and eager to collect the next reward. The visual world is adventurous without becoming dark, violent, or intimidating.

Core attributes:

- Clear
- Energetic
- Rewarding
- Friendly fantasy
- Collectible
- Mobile-first

## 2. Audience and Experience

- Primary audience: upper-elementary and middle-school learners
- Primary device: portrait mobile web/PWA and Android hybrid app
- Core fantasy: recover Word Crystals by defeating monsters with correct answers
- Core interaction: `Study = Battle`
- UI priority: question, remaining time, answer choices, and result feedback always outrank decoration

## 3. Visual Language

### Shape

- Use rounded panels, pill-shaped status chips, circular gems, and softly faceted crystal motifs.
- Use generous spacing and one strong focal element per screen.
- Use thin cool-gray borders and soft violet shadows to separate layers.
- Preserve clear silhouettes at gameplay distance and at small mobile sizes.

### Material

- Frosted glass
- Polished crystal
- Soft magical light
- Clean enamel-like item surfaces
- Restrained metallic gold for rare rewards

Avoid stone-framed retro HUDs, parchment-heavy surfaces, gritty realism, and generic dashboard cards.

### Color tokens

| Role | Token | Value | Use |
|---|---|---:|---|
| Primary | Crystal Violet | `#5751D8` | Primary actions, selected states, progression |
| Primary Bright | Arcane Violet | `#7868EF` | Gradients, magic, active accents |
| Secondary | Crystal Mint | `#60D9CF` | Positive feedback, EXP completion, support accents |
| Reward | Treasure Gold | `#FFCF67` | Coins, rare items, treasure moments |
| Surface | Moon White | `#F7F7FF` | Main backgrounds and cards |
| Ink | Night Violet | `#24214C` | Primary text and high-contrast outlines |
| Muted | Mist Gray | `#74718A` | Secondary labels and metadata |
| Danger | Ember Coral | `#EF5B67` | Time warning, damage, game over |

Do not communicate success, rarity, danger, or selection by color alone. Pair color with text, icons, shape, or motion.

### Typography

- Use a friendly, highly legible Korean sans-serif for UI and learning content.
- Use strong weight contrast rather than decorative type for hierarchy.
- Reserve fantasy-styled lettering for logos, chapter headings, and reward moments.
- English vocabulary is the primary focal text during a question and must remain readable at a glance.

## 4. Character Direction

- Stylized 2D fantasy characters with youthful proportions and expressive faces
- Clean silhouette, large readable weapon or class prop, and a clear class color accent
- Three-quarter pose for profile/status art; side-facing action poses for battle
- Detailed enough to feel collectible, simplified enough to read at 64–128 px
- Transparent-background WebP or PNG masters
- Equipment must support visible layered slots: Head, Body, Weapon, Back, Aura, Pet
- Every playable class ships with at least one male and one female base appearance.
- Gender variants share the same class silhouette, prop, rendering quality, and palette; distinguish identity through face, hair, costume details, and proportions without sexualization.
- Base portrait export standard: 512 × 512 transparent WebP, approximately 110–125 KB per character, using female mage as the quality reference. Use high-resolution masters rather than enlarging 80–128 px thumbnails. Validate real alpha over a colored background; a painted checkerboard is not transparency.
- Store the selected base appearance as `avatar_variant` (`male` or `female`) and preserve it consistently in creation, profile cards, status UI, and battle HUD.

Class silhouette cues:

- Warrior: broad shoulder shape and dominant sword
- Rogue: compact asymmetry and twin daggers
- Mage: staff/orb and circular magic shape
- Fighter: large gloves and forward stance
- Archer: bow arc and light cape/hood shape

## 5. Shop and Item Direction

- Present items like collectible jewels on bright, quiet pedestals.
- Give every item one dominant silhouette and one rarity accent.
- Show price and ownership state without covering the item art.
- Equipped items must visibly change the character preview.
- Use gold only as a reward/rarity signal; do not flood normal screens with it.

Recommended asset structure:

```text
assets/
├── characters/[class]/
├── equipment/[slot]/
├── items/[category]/
├── monsters/[dungeon]/
├── environments/[dungeon]/
├── effects/
└── ui/crystal-quest/
```

Naming pattern:

```text
[type]_[object]_[variant]_[state].[ext]
char_mage_frost_profile.webp
item_crown_starlight_shop.webp
fx_crystal_reward_burst.webp
ui_button_primary_pressed.webp
```

## 6. Status and Navigation UI

- Hero area: character art, level, name, class, and one class-trait label
- Progress area: EXP bar and next unlock
- Quick stats: highest combo, accuracy, and cleared stages
- Primary action: one prominent violet dungeon-entry button
- Secondary actions: equipment, inventory, shop, and records
- Mobile navigation: four or fewer persistent destinations
- Keep panels rounded and layered, with short labels and large tap targets

## 7. Battle HUD

Preserve the GDD screen ratio:

- Top third: battle scene, character/monster silhouettes, progress, rewards
- Bottom two-thirds: vocabulary prompt, pronunciation, timer, and four choices

Use crystal effects to connect learning and combat:

```text
Correct answer
→ mint confirmation
→ violet/blue class attack
→ crystal shard burst
→ gold coin or EXP pop
→ next monster
```

Keep the center and answer area free from persistent decorative effects. Strong motion is reserved for correct answers, combo milestones, danger, stage clear, treasure, and level-up.

## 8. Motion Tone

- Buttons: quick 120–180 ms press and release
- Panels: soft 180–240 ms fade/slide
- Coin: short upward pop with one sparkle
- Combo: scale emphasis that increases only at milestones
- Level-up/treasure: 600–900 ms hero moment with crystal rays
- Respect `prefers-reduced-motion`

## 9. Production Rules

- Design at the source resolution and export responsive variants; do not enlarge low-resolution raster art.
- Test character and item silhouettes at their actual gameplay size.
- Keep the same object in the same color family across status, shop, inventory, and battle.
- Test desktop and portrait mobile layouts for every major screen.
- Test Android WebView builds with the same mobile readability, safe-area, and touch-target standards as the browser version.
- Use CSS variables for all UI theme tokens.
- Decorative art must never reduce answer readability or hide game state.

## 10. Direction Drift Checklist

Do not ship:

- Pixel-art frames or retro arcade typography as the primary UI language
- Parchment, ink, or storybook materials as the primary UI language
- Dark gritty fantasy, realistic violence, or muddy low-contrast scenes
- Emoji as final character, equipment, monster, or shop art
- Mixed illustration styles between character classes
- Dense admin-dashboard layouts
- Background detail that competes with learning content

When uncertain, open `art-direction.html?concept=crystal` and match Direction 01.

## 11. 생성형 이미지 공통 스타일 바이블

이 절은 Gemini 계열 이미지 생성 도구(일명 Nano Banana)를 포함한 생성형 이미지 모델에서 **서로 다른 제작일에도 같은 작품군처럼 보이는 결과**를 얻기 위한 고정 규격이다. 프롬프트마다 아래의 공통 스타일 블록을 그대로 유지하고, 주제·행동·구도만 바꾼다. 특정 작가나 기존 게임 IP의 화풍을 지시하지 않는다.

### 11.1 스타일 이름과 한 문장 정의

내부 스타일명은 **Wordoria Crystal Quest Illustration**이다.

> 밝은 하이엔드 모바일 RPG용 2D 애니메이션 판타지 일러스트. 선명하고 큰 실루엣, 깨끗한 셀 셰이딩 위에 부드러운 채색 그라데이션, 보랏빛·푸른빛의 투명 크리스털, 민트 마법광, 절제된 금장, 젊고 용감한 표정, 읽기 쉬운 형태를 사용한다.

이 스타일은 다음 세 층이 동시에 보여야 한다.

1. **즉시 읽히는 캐주얼 형태** — 작은 모바일 화면에서도 직업·아이템·행동을 1초 안에 구분
2. **수집하고 싶은 정교함** — 얼굴, 주 장비, 크리스털에만 섬세한 하이라이트와 장식 집중
3. **안전하고 밝은 모험성** — 위험은 표현하되 공포, 잔혹함, 성적 대상화 없이 자신감과 성취감 유지

### 11.2 공통 형태 언어

- 전체 실루엣은 큰 원형·물방울형·완만한 삼각형을 중심으로 구성한다. 뾰족한 형태는 무기 끝과 크리스털 면에만 제한한다.
- 외곽선은 순수 검정이 아닌 **짙은 남보라색 또는 대상 고유색의 어두운 변형**을 사용한다. 얼굴 내부선은 외곽선보다 가늘고 부드럽다.
- 외곽선 두께는 최종 표시 크기 기준으로 일정하게 보이게 하며, 중요한 외곽은 굵게, 의상 주름과 얼굴은 얇게 처리한다. 잔털·미세 패턴 같은 노이즈성 선은 피한다.
- 한 자산에는 `대형 실루엣 1개 + 중형 형태 2~4개 + 작은 장식 소수`의 위계를 둔다. 모든 면에 같은 밀도의 장식을 넣지 않는다.
- 직선보다 부드러운 곡선을 우선하되, 크리스털·검날·갑옷 모서리는 깨끗한 각으로 대비시킨다.
- 손, 얼굴, 직업 도구는 겹치거나 잘리지 않아야 하며 썸네일에서도 분리되어 보여야 한다.

### 11.3 선화와 채색

- 렌더링은 **clean anime linework + polished soft cel painting**이다. 수채화, 유화 붓자국, 3D 실사 렌더, 플랫 벡터, 픽셀 아트로 바꾸지 않는다.
- 명암은 기본적으로 `밝은 면 → 한 단계의 명확한 셀 그림자 → 접촉부의 짙은 그림자`의 3단 구조를 사용한다.
- 셀 그림자의 경계는 얼굴과 큰 의상 면에서 깨끗하게 유지하고, 머리카락·마법광·크리스털 주변에만 짧고 부드러운 그라데이션을 허용한다.
- 광원은 기본적으로 **화면 좌상단의 부드러운 주광**이다. 크리스털이나 마법은 청보라/민트색 보조광을 내며 주변 가장자리에만 색을 반사한다.
- 하이라이트는 눈, 머리카락 덩어리, 금속 모서리, 크리스털 능선에 집중한다. 피부와 천 전체를 플라스틱처럼 번쩍이게 만들지 않는다.
- 그림자는 검정이 아니라 저채도 남보라색 계열을 사용한다. 지나친 에어브러시, 흐릿한 외곽, 회색 안개, 탁한 갈색 필터를 금지한다.

### 11.4 색과 재질 배분

- 화면 면적의 권장 비율은 `Moon White/밝은 중립색 45~60%`, `직업 고유색 20~30%`, `Crystal Violet/Arcane Violet 10~20%`, `Mint와 Gold 강조색 합계 5~10%`다.
- **Crystal Violet `#5751D8` / Arcane Violet `#7868EF`**: 마법, 진행, 선택, 주 크리스털
- **Crystal Mint `#60D9CF`**: 정답, 치유, 보조광, 긍정 피드백
- **Treasure Gold `#FFCF67`**: 희귀 장식과 보상 포인트에만 사용. 넓은 금색 면은 피한다.
- **Moon White `#F7F7FF`**: 의상과 배경의 밝은 휴식 공간. 흰 의상은 회청색/연보라 그림자로 형태를 보존한다.
- **Night Violet `#24214C`**: 가장 짙은 선, 깊은 그림자, 가독성 기준색
- 크리스털은 유색 유리처럼 `밝은 중심 또는 모서리 하이라이트 + 반투명 색면 + 2~4개의 큰 절단면 + 작은 별빛 반사`로 표현한다. 무수한 파편과 노이즈를 넣지 않는다.
- 금속은 매끈한 에나멜 금속으로, 밝은 띠 하이라이트와 한 단계의 짙은 반사를 사용한다. 낡음, 녹, 흠집은 기본적으로 넣지 않는다.
- 천은 깨끗하고 두께감 있는 판타지 의상 소재다. 가죽은 매끈하며 거친 모공이나 사실적 마모를 강조하지 않는다.
- 마법 효과는 중심 형태가 분명한 리본, 원호, 룬 원, 별 모양 스파크, 3~7개의 큰 결정 파편으로 구성한다. 캐릭터 얼굴과 주 무기를 가리지 않는다.

### 11.5 얼굴, 나이, 신체 표현

- 플레이어 캐릭터는 **초등 고학년~중학생이 동경할 밝고 젊은 영웅상**으로 표현한다. 실제 아동의 사진 같은 사실성은 피한다.
- 얼굴은 둥근 턱선, 작은 코, 큰 아몬드형 눈, 또렷한 눈동자 하이라이트, 읽기 쉬운 눈썹과 입 모양을 사용한다.
- 표정은 자신감, 집중, 놀람, 기쁨처럼 명확한 한 감정에 집중한다. 무표정한 패션 모델 표정이나 과도한 분노는 피한다.
- 피부 질감은 매끈한 애니메이션 채색으로 표현한다. 모공, 수염 자국, 과도한 광택, 포토리얼 피부를 넣지 않는다.
- 모든 성별 변형은 같은 직업 실루엣과 전투 능력을 공유한다. 노출, 가슴·허리·엉덩이 강조, 하이힐 전투복, 성인화된 화장과 포즈를 금지한다.
- 손은 읽기 쉽게 단순화하되 손가락 수와 관절 방향은 정확해야 한다. 무기 손잡이를 실제로 잡고 있어야 한다.

### 11.6 자산군별 스타일 단계

#### A. 프로필·키아트

- 비율: 약 **5.5~6.5등신**의 스타일라이즈드 애니메이션 영웅
- 구도: 허벅지 위 또는 전신의 역동적인 3/4 뷰, 얼굴과 가슴은 카메라 쪽, 주 도구가 실루엣 밖으로 명확히 보임
- 렌더 밀도: 얼굴, 머리카락, 주 무기, 가슴 문장, 대표 크리스털에 높게 집중
- 배경: 런타임 자산은 진짜 투명 배경. 홍보용 이미지만 옅은 원형 글로우와 소수의 파편 허용
- 금지: 정면 증명사진 자세, 패션 화보, 과도한 원근 왜곡, 신체를 가리는 거대 효과

#### B. 전투 SD/chibi 스프라이트

- 비율: **2.25~2.75등신**, 머리가 전체 높이의 약 36~42%, 손과 직업 도구는 실제 비례보다 크게
- 키아트의 얼굴, 헤어 실루엣, 의상 색 배치, 문장, 주 무기를 그대로 축약한다. 새 의상으로 재해석하지 않는다.
- 눈·입·손·무기 방향과 접촉 프레임이 128 px 표시 크기에서도 읽혀야 한다.
- 옆을 향한 전투 자세에서도 얼굴의 두 눈 또는 앞눈과 코 방향이 명료해야 한다.
- 애니메이션 셀 규격, 앵커, 프레임 수, 투명도는 이 문서 상단과 저장소의 SD 스프라이트 규칙을 따른다.

#### C. 몬스터와 펫

- 플레이어와 같은 선화·3단 명암·크리스털 재질을 사용한다.
- 일반 몬스터는 `하나의 생물 모티프 + 하나의 속성 + 하나의 큰 표정`으로 제한한다.
- 적도 장난감처럼 무해하게 만들 필요는 없지만, 피·상처·썩은 살·신체 공포는 사용하지 않는다.
- 펫은 2~2.5등신 또는 한 덩어리형 몸체, 큰 눈, 짧은 팔다리, 한 개의 대표 장식으로 구성한다.

#### D. 아이템과 장비

- 정면 또는 약한 3/4 뷰의 단일 물체, 중앙 배치, 회전 없이 한눈에 기능이 보여야 한다.
- 한 개의 큰 실루엣과 한 개의 크리스털 포인트를 우선하며, 장식은 좌우 균형 또는 의도적인 한쪽 강조로 정리한다.
- 인벤토리용은 글자, 가격표, 프레임, 바닥 그림자 없이 진짜 투명 배경으로 출력한다.
- 같은 아이템의 등급 변형은 실루엣을 유지하고 크리스털 광도, 작은 금장, 오라 강도만 단계적으로 늘린다.

#### E. 배경과 던전

- 캐릭터보다 한 단계 낮은 대비와 채도를 사용한 밝은 애니메이션 판타지 배경이다.
- 큰 전경, 이동 가능한 중경, 분위기를 만드는 원경의 3층으로 나누고 플레이 영역에는 복잡한 무늬를 두지 않는다.
- 수정 동굴도 검거나 공포스럽게 만들지 않는다. Moon White 안개, 청보라 암석, 민트 반사광으로 밝은 길을 확보한다.
- 배경의 작은 물체와 파편은 캐릭터 얼굴 주변과 문제 UI가 놓이는 영역을 피한다.

### 11.7 카메라와 출력 규칙

- 캐릭터 단독 자산은 특별한 이유가 없으면 50~85 mm 느낌의 낮은 왜곡을 사용한다. 초광각, 어안, 극단적 로우 앵글은 피한다.
- 시선과 주 무기 앞에는 여백을 남긴다. 머리카락, 손, 발, 무기, 망토, 마법 효과를 프레임 밖으로 자르지 않는다.
- 생성 원본은 최종 출력보다 크게 만든 뒤 축소한다. 캐릭터 마스터는 최소 2048 px 정사각형을 권장한다.
- 투명 자산 요청 시 프롬프트에 `isolated single subject, true transparent alpha background, no floor, no frame, no text`를 명시하고, 생성 후 실제 알파를 별도로 검사한다.
- 한 장에 캐릭터 시트나 여러 프레임을 생성할 때는 모델이 인물 형태를 섞을 수 있으므로, 최종 런타임 프레임은 개별 생성·검수 후 정규화한다.

## 12. Gemini 이미지 생성용 고정 프롬프트

프롬프트는 **고정 스타일 블록 → 자산 정체성 → 장면/동작 → 구도/출력 → 금지 블록** 순서로 작성한다. 생성할 때마다 고정 블록의 어휘와 순서를 되도록 바꾸지 않는다. 참조 이미지를 첨부할 수 있다면 승인된 동일 캐릭터의 전신 원본을 첫 번째 참조로 사용하고 “의상·얼굴·색을 재설계하지 말 것”을 명시한다.

### 12.1 복사해서 사용하는 고정 스타일 블록

```text
WORDORIA CRYSTAL QUEST STYLE — a bright premium 2D anime fantasy illustration for a polished mobile RPG, clean colored linework with dark violet outer contours, crisp three-step soft cel shading, selective smooth gradients only on hair, crystal light and magical glow, large readable silhouette, youthful heroic expression, elegant rounded shapes contrasted with a few clean crystal facets, luminous violet and blue crystal glass, restrained mint magical rim light, small refined gold accents, moon-white resting areas, clean enamel-like equipment, vivid but controlled color, friendly adventurous mood, highly readable at mobile size, original IP design, consistent production-game asset quality.
Lighting: soft key light from upper left, cool violet ambient shadow, crystal or magic may cast a subtle cyan-mint secondary light. Keep the face, hands and main class prop unobstructed. Use one dominant focal point, two to four supporting forms, and sparse tiny details.
```

### 12.2 고정 금지 블록

Gemini에 별도 negative prompt 입력란이 없다면 아래 내용을 본문 마지막에 그대로 붙인다.

```text
DO NOT use pixel art, retro arcade styling, parchment or storybook texture, photorealism, realistic 3D rendering, painterly oil or watercolor brushwork, flat corporate vector art, gritty or muddy dark fantasy, horror, gore, dirty weathering, excessive bloom, gray fog, neon overload, full-gold surfaces, black comic outlines, sketch lines, visual noise, over-detailed background, text, letters, logo, watermark, UI frame, fake checkerboard, painted background on a transparent asset, cropped hair, cropped hands, cropped feet, cropped weapon, hidden face, extra fingers, fused hands, broken anatomy, sexualized body, revealing armor, adult glamour makeup, or imitation of any existing artist, anime, game, or copyrighted character.
```

### 12.3 캐릭터 키아트 템플릿

```text
[고정 스타일 블록]

Create one original [성별 표현] [직업] hero named [이름]. Identity lock: [나이 인상], [얼굴형/눈], [헤어 형태와 색], [피부색], [직업 대표 색], [의상 핵심 형태], [문장/크리스털 위치], [주 무기]. Preserve these identity details exactly across future images.
Pose and emotion: [동작], [표정]. Three-quarter full-body hero pose, approximately 6-head-tall stylized proportions, clear face and both hands, the entire weapon and both feet visible, strong class silhouette, no overlapping effect over the face.
Output: one isolated character centered on a true transparent alpha background, 2048 x 2048 source, no floor, no text, no border. Leave 8 percent safe space around hair, cape, weapon and effects.

[고정 금지 블록]
```

### 12.4 동일 캐릭터 전투 SD 템플릿

```text
[고정 스타일 블록]

Using the attached approved full-body identity image as the sole authority, create the exact same [직업/성별/이름] as a battle-ready SD chibi character. Preserve the exact face, eye color, hairstyle silhouette, costume color blocking, emblem, crystal placement and signature weapon; do not redesign or simplify away identity marks.
Proportions: 2.5 heads tall, head about 40 percent of total height, compact body, enlarged readable hands and weapon, youthful and nonsexualized. Facing [오른쪽/왼쪽], [동작과 프레임의 감정], stable ground line and consistent scale.
Output: one isolated full-body pose in one 320 x 320 runtime cell, true transparent alpha, bottom-center anchor at x 0.5 and y 0.975, all hair, feet, weapon and effects fully inside the cell, no floor shadow, no text, no border.

[고정 금지 블록]
```

애니메이션은 한 번에 “스프라이트 시트처럼 만들어 달라”고만 요청하지 말고 각 프레임의 역할을 고정한다. 예:

```text
Frame 1 ready: balanced stance and clearly visible weapon.
Frame 2 anticipation: body compresses and weapon draws back.
Frame 3 contact: strongest readable strike silhouette; this is the gameplay hit frame.
Frame 4 follow-through: hair and cape continue along the motion arc.
Frame 5 recovery: returns toward the same ground line without changing costume or scale.
```

### 12.5 아이템 템플릿

```text
[고정 스타일 블록]

Create one collectible [아이템 종류] called [이름]. Core silhouette: [큰 형태]. Function must be obvious from the silhouette. Materials: [에나멜 금속/천/유리 크리스털], with one [색] crystal focal point and restrained [등급] accents. Front-facing with a slight three-quarter turn, symmetrical presentation unless [비대칭 이유]. No character and no hands.
Output: a single centered game inventory asset, true transparent alpha background, square 1024 x 1024 source, no pedestal, no cast shadow, no rarity frame, no text, no price tag, 10 percent clear padding.

[고정 금지 블록]
```

### 12.6 몬스터·펫 템플릿

```text
[고정 스타일 블록]

Create one original [몬스터/펫] based on [생물 모티프] and [속성]. Its design has one large [몸체/실루엣], one unmistakable [대표 장식], and a clear [감정] expression. Use [주색], [보조색], and a small [크리스털 색] crystal accent. It must feel [친근함/도전적임] without horror or realism and remain recognizable at 96 px.
Pose: [행동], full body, clean separation of limbs and face.
Output: one isolated subject on true transparent alpha, square 1024 x 1024 source, no ground, no text, no border, 10 percent safe padding.

[고정 금지 블록]
```

### 12.7 배경 템플릿

```text
[고정 스타일 블록]

Create a bright fantasy [던전/지역] environment for a mobile side-view learning battle. Theme: [장소], [시간], [분위기]. Use a three-layer composition: softly framed foreground, a clean and level middle-ground battle path, and an atmospheric distant background. Keep the central battle silhouettes and the lower two-thirds learning UI region visually quiet. Use lower contrast and saturation than the characters, with violet-blue crystals and restrained mint reflections guiding the path.
Output: [가로세로비와 해상도], no characters, no monsters, no text, no UI, no logos. Avoid tiny repetitive detail in the play area.

[고정 금지 블록]
```

## 13. 생성 일관성 운영 규칙

스타일 프롬프트만으로는 동일 캐릭터를 완전히 고정할 수 없다. 아래 제작 절차를 함께 지킨다.

1. **정체성 원본 확정**: 캐릭터마다 승인된 전신 이미지 1장을 `identity master`로 지정한다. 이후 모든 생성에 같은 원본을 첨부한다.
2. **정체성 문장 고정**: 얼굴, 눈, 헤어, 피부, 색 배치, 문장, 무기의 설명을 1개의 `identity lock` 문단으로 만들고 철자까지 동일하게 재사용한다.
3. **한 번에 한 변수만 변경**: 포즈를 바꾸는 생성에서는 의상·표정·카메라를 동시에 재설계하지 않는다. 장비 변경 시에도 얼굴과 기본 의상 색 배치는 고정한다.
4. **시드보다 참조 이미지 우선**: 지원된다면 같은 시드도 기록하지만, 모델이나 버전이 바뀌면 시드만으로 동일성을 보장하지 못하므로 승인 이미지와 고정 문장을 기준으로 삼는다.
5. **후보 수 제한과 선별**: 한 요청에서 2~4개 후보를 만들고, 가장 예쁜 이미지보다 규격과 정체성에 가장 충실한 이미지를 선택한다.
6. **승인본 연쇄 사용 금지**: 작은 오류가 있는 생성물을 다음 참조로 계속 사용하지 않는다. 항상 원래 identity master와 가장 최근의 명시적 승인본을 함께 기준으로 둔다.
7. **메타데이터 기록**: 파일 옆 JSON 또는 제작 로그에 모델명/버전, 날짜, 전체 프롬프트, 참조 이미지, 비율, 해상도, 승인 상태를 남긴다.
8. **출력 후 기술 검수**: 알파, 잘림, 손가락, 눈동자, 무기 연결, 의상 문장, 좌우 방향, 축소 가독성, 팔레트 편차를 확인한다. 모델이 만든 글자는 사용하지 않는다.

### 13.1 승인 체크리스트

- 128 px로 축소했을 때 직업과 행동이 즉시 구분되는가?
- 기존 승인 캐릭터와 눈, 얼굴형, 헤어 실루엣, 의상 색 배치, 무기가 같은가?
- 선화가 검은 만화선이나 흐린 회화선이 아니라 짙은 남보라 계열의 깨끗한 색선인가?
- 명암이 3단으로 읽히며 마법광 때문에 형태가 날아가지 않는가?
- Violet/Mint/Gold가 기능에 맞게 절제되어 사용되었는가?
- 얼굴, 손, 발, 무기, 효과가 잘리거나 서로 융합되지 않았는가?
- 투명 자산에 실제 알파가 있고 흰색 의상 내부가 뚫리지 않았는가?
- 기존 IP나 특정 작가의 식별 가능한 요소를 모방하지 않았는가?
- 어린 이용자에게 적합하고 비성적·비잔혹한가?
- UI와 함께 놓았을 때 학습 정보보다 먼저 소리치지 않는가?
