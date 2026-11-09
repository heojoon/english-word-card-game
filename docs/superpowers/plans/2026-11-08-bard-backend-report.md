# Bard backend implementation report

Status: DONE. No commit or push.

## Files
- `supabase/migrations/20261108085111_add_bard_character.sql`
- `scripts/verify-bard-account.sql`

## Implementation
- Extended `game_characters_class_check` and `create_account_character` allowlist with `bard`.
- Preserved existing authenticated owner derivation, serialized profile lock, character ticket ownership/atomic consumption, input checks, female-only sniper constraint, empty search path, and authenticated-only RPC grants.
- Read the actual remote function before editing; it matched the repository's latest sniper definition.
- Other class allowlists are for legacy skill catalogs or World 8 extra unlocks. Bard's initial healing skill does not use those unlocks, so these were intentionally unchanged.

## Remote evidence
- Used cached Supabase CLI v2.122.0; unqualified `supabase` is absent from PATH. CLI help discovered before commands. CLI telemetry needed ordinary approved sandbox escalation.
- Created migration through `supabase migration new add_bard_character`.
- `migration list --linked`: only `20261108085111` pending.
- `db push --linked --dry-run`: exactly `20261108085111_add_bard_character.sql`, no seeds/roles.
- `db push --linked --yes`: applied that one migration successfully.
- Final `migration list --linked`: 141 migrations, zero local/remote mismatches; last version `20261108085111` on both.

## Regression evidence
- Before implementation, `scripts/verify-bard-account.sql` failed at first bard creation with expected `invalid character class`.
- After migration, exact same SQL passed: `bard male/female, tickets, auth, class validation and RLS passed`.
- Fixtures and ticket consumption are transactionally rolled back. Test covers free first male bard, denied free second character, ticket-paid female bard, recorded ticket consumption, rejected male sniper, rejected invalid class, rejected unauthenticated creation, anon denial/authenticated grant, and enabled character RLS.
- Security advisor run after DDL. No anon grant on character creation. It reports the existing authenticated SECURITY DEFINER API (intentional for atomic tickets with explicit auth check) and unrelated project-wide existing warnings. No table, policy, secret, or Edge Function added.
- No local database started or used.

## References
- Supabase function privilege/search-path guidance: https://supabase.com/docs/guides/database/functions
- Advisor for authenticated definer APIs: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable

No backend deployment remains for bard class support; frontend publication is outside this task.

## Follow-up server growth / damage audit
- Searched every repository migration and current remote public/private function bodies for class, sniper, growth, stats, HP/MP, attack and damage rules. No server-side growth or level-stat formula exists: the frontend owns these calculations. `story_character_vitals` stores owner-scoped nonnegative HP/MP without class branches.
- Reviewed all nine current class-dependent remote APIs/triggers: account creation; six/seven-argument result reward overloads; treasure; Story roulette; Vargas; World 9 result; equipped-skin and skin-inventory eligibility. Bard uses the same nonspecial branches as sniper for combo rewards (five answers), treasure, roulette time allowance, training boss validation and warrior-only slash rejection.
- Found and fixed an additional real blocker: Vargas reward used an unconditional legacy active-unlock insert, whose class constraint intentionally excludes bard. Bard victories would fail and roll back rewards. Added `20261108085529_guard_legacy_bard_boss_unlock.sql` with an exact function-body patch to guard this one insert to the existing five legacy classes. The bard starts with healing, so no World 8 legacy unlock row is needed. All live owner/progression/reward/time validations (including 1,080,000 ms maximum) are preserved.
- Added `scripts/verify-bard-boss-rewards.sql`. Before patch it failed at the expected unlock-class constraint. After patch it passed bard reward (45 correct => 64 crystals), score, zero-reward replay, existing sniper unlock, unchanged wallet total and foreign-owner rejection; all fixture writes roll back.
- Second `migration list --linked` and dry-run reviewed exactly `20261108085529_guard_legacy_bard_boss_unlock.sql`; it was applied with `db push --linked --yes`. Final history: 142 migrations, zero mismatches, both bard versions present on local and remote.
- Re-ran original account regression after the follow-up migration: passed.
