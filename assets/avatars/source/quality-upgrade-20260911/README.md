# Character quality upgrade — applied

Quality reference: `../../variants/mage-female.webp` (512 × 512, 117,186 bytes, real alpha).

The `*-pending.png` files are the original 1254 × 1254 ImageGen redraws, with opaque backgrounds. The corresponding files without `-pending` are the locally processed RGBA masters. Runtime WebP files were replaced only after reviewing the alpha cutouts over a violet background. Keep the original redraws for future matte refinement.

| Candidate | Runtime target after alpha cleanup |
|---|---|
| `warrior-male-pending.png` | `assets/avatars/warrior.webp` |
| `mage-male-pending.png` | `assets/avatars/mage.webp` |
| `pugilist-female-pending.png` | `assets/avatars/pugilist.webp` |
| `ranger-female-pending.png` | `assets/avatars/ranger.webp` |

## Generation method and prompt set

Built-in ImageGen, separate edit per character, with the original avatar as identity/pose reference and female mage as the rendering-quality reference.

Shared prompt: Repaint the low-resolution character as genuinely high-resolution, polished Crystal Quest anime mobile RPG art. Match the female mage's fine linework, detailed hair/eyes and material rendering. Preserve class identity, pose, costume palette and weapons. Square waist-up portrait, no text, watermark or frame; request actual transparent alpha background.

- Male mage: brown spiky hair, blue eyes, blue/white/gold robes, crystal staff and casting hand.
- Male warrior: brown spiky hair, blue eyes, silver/gold armor, blue scarf and sword.
- Female pugilist: brown hair, red headband/ribbons, red/gold gauntlets and martial arts outfit.
- Female ranger: brown hair, green hood/cape, leather armor, gold accents, bow and quiver.

Background extraction prompt: Remove all background/checkerboard pixels, preserve character artwork exactly, return real PNG alpha rather than painted transparency. Three extraction retries still returned RGB.

## Applied output

The user authorized local processing. `scripts/normalize-avatar-quality.cjs` segments backgrounds from decoded RGB buffers, with hand-reviewed keep regions for silver armor and weapons. This is a local matte extraction, not an AI segmentation model. Fine translucent spell effects and hair-edge matting may benefit from further artist refinement.

All runtime assets are 512 × 512 transparent WebP. Female mage remains byte-for-byte unchanged as the quality reference. The other assets were encoded from high-resolution sources with libwebp compression level 6, choosing a high-quality setting near the reference's file size rather than padding bytes.

| Character | WebP quality | Bytes |
|---|---:|---:|
| Male warrior | 95 | 114004 |
| Female warrior | 92 | 113472 |
| Male mage | 88 | 111258 |
| Female mage (reference, unchanged) | Original | 117186 |
| Male pugilist | 92 | 118400 |
| Female pugilist | 92 | 120648 |
| Male ranger | 95 | 122176 |
| Female ranger | 88 | 123464 |

Game, preview, legacy avatar loader, and art-direction image URLs use cache version `20260911-hq`. File dimensions/alpha channels and JavaScript syntax passed validation. Browser automation could not run in the restricted environment (Chromium sandbox-host operation denied); visual alpha validation used flattened violet-background images.

To repeat local extraction, decode each `*-pending.png` with FFmpeg into a 1254 × 1254 `rgb24` raw file named `<character>.rgb` in a temporary working directory. Pass that directory to `node scripts/normalize-avatar-quality.cjs <directory>`. It writes corresponding `.rgba` raw buffers; encode with FFmpeg using input pixel format `rgba` and video size `1254x1254`. Final exports use Lanczos scaling to 512 × 512. Inspect results before replacing runtime files.
