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
