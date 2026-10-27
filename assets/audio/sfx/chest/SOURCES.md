# Treasure chest effects

Source: Kenney Vleugels, CC0 (personal/commercial use and redistribution allowed).
The original license notices are included in this directory.

- [RPG Audio](https://kenney.nl/assets/rpg-audio): `metalClick.ogg`, `metalLatch.ogg`, `creak1.ogg`, `handleCoins.ogg`.
- [Music Jingles](https://kenney.nl/assets/music-jingles): `Audio/Steel jingles/jingles_STEEL00.ogg`.

Downloaded 2026-10-27 from the official packs:

- https://kenney.nl/media/pages/assets/rpg-audio/8e99002d76-1677590336/kenney_rpg-audio.zip
- https://kenney.nl/media/pages/assets/music-jingles/f37e530b9e-1677590399/kenney_music-jingles.zip

Runtime: mono 48 kHz, PCM 16-bit WAV for browser/native compatibility.
Tap variants use metalClick and metalLatch respectively: trim leading silence
below -50 dB, high-pass at 100 Hz, limit at 0.5 without makeup gain, fade out
from 220 to 280 ms, maximum duration 280 ms. Runtime pitch varies by ±2.5%
and the manager avoids consecutive repetition of the same variant.

Opening combines creak1 (150 Hz high-pass, gain 0.8, fade at 450–650 ms),
STEEL00 (gain 0.65, delay 280 ms), and handleCoins (gain 0.22, delay 350 ms).
Mix without automatic normalization, limit at 0.63 without makeup gain,
fade from 1.05–1.25 s, and cap at 1.25 s. Limiter latency is compensated.
The bright steel notes begin with the open-art CSS transition at 280 ms.

Every accepted tap plays CHEST_TAP; the third also plays CHEST_OPEN as an
intentional latch/hinge/reward layer. Both crystal and item chests use it.
Muted settings and the SFX/master buses apply through SoundManager.

## Reward reveal effects (2026-10-28)

Source: the same official CC0 Music Jingles pack and included license above.
These are edits of recorded assets, not AI-generated audio.

- `sfx_reward_crystal_01.wav`: `jingles_STEEL00.ogg`, leading silence below
  -50 dB removed, playback rate 1.1, high-pass 250 Hz, soft echoes at 80/160 ms
  (decay 0.22/0.12), fade out 1.15-1.60 s, duration 1.60 s.
- `sfx_reward_item_01.wav`: `jingles_PIZZI00.ogg` (gain 0.6) layered with
  `jingles_STEEL00.ogg` (gain 0.35, playback rate 1.1, delay 90 ms). Leading
  silence below -50 dB removed from both, mix without normalization, high-pass
  150 Hz, soft echoes at 95/190 ms (decay 0.18/0.10), fade out 1.25-1.80 s,
  duration 1.80 s.

Both are mono 48 kHz PCM 16-bit WAV, limited to 0.6 with no makeup gain and
compensated limiter latency. Echo input/output gains are 0.8/0.45 for crystal
and 0.8/0.4 for item. The manifest applies event volume 0.8 before SFX/master
settings. Files are preloaded on entry to the first chest, including the next
Story item chest.

REWARD_CRYSTAL / REWARD_ITEM fire only after the reward claim succeeds and
the reveal screen renders, following the minimum 900 ms chest-opening motion.
Zero-crystal repeat claims and failed claims do not play a reward cue.
Rendering the screen again and pressing Continue do not replay the sound.
