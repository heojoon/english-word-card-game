# World 8+ fever roulette

The user requested replacing fever time from World 8 onward with a six-section wheel. The updated user distribution (2026-11-01) is blank 5%, x0.5 10%, x1 30%, x1.5 25%, x2 20%, x3 10%. Preserve the Crystal Quest visual language and all existing working-tree changes.

- Eligible ordinary Story clears use the wheel starting at internal chapter 11 (display World 8). Existing bosses without fever retain their reward contracts. Earlier worlds and hidden fever are unchanged.
- Freeze remaining time at clear in milliseconds. Display seconds to three decimal places so the formula is reproducible. Reward = round(remaining milliseconds / 1000 × multiplier), with multipliers [1, 2, 3, 0.5, 0, 1.5].
- A large red button starts rotation; a second press requests the result and decelerates to the chosen section. Each run has one outcome. Replays display the spin but pay no additional reward, as with existing Story replays.
- Results appear in a sparkling modal overlay with the formula and awarded crystal count. The result button continues to the existing stage result flow.
- Generate a new looping roulette BGM, wheel tick, mechanical red-button cue, and short celebratory fanfare with cheering. Use manifest event IDs and existing volume/mute behavior. Use a gentle zero-result cue for the blank outcome.
- Account results are sampled and awarded atomically by a dedicated ownership-checked RPC. Persist a request receipt for idempotent retries. Guest results use the same formula and weighted selection locally.
- Reduced motion shortens wheel travel and confetti. Native/browser pause must freeze rotation and stop ticking. No browser checks unless requested. Run Node regressions and the full build.

Approach: use the existing DOM/CSS renderer and SoundManager. A separate canvas/game engine adds unnecessary dependencies; client-selected account rewards would leave the result unverified. Use the existing result RPC for base rewards inside the new transaction, preserving replay and progression rules.

Builder decisions: six wedges sized in proportion to their probabilities; preserve prior receipt indices and append x1.5 as index 5; use an active-time angle clock, a short deceleration, and an explicit result confirmation. Generate music with the project's configured ElevenLabs account; keep keys in local configuration only.
