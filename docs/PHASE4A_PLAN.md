# Phase 3.5 completion and bounded Phase 4A combat proposal

**2026-10-16 · design only.** Baseline `a54a872` on
`codex/phase-2b-3-generations`, continuing
[PR #1](https://github.com/PakingPie/Flatland-A-Web-Based-Game/pull/1).
The user selected resolving renewal and archival design first. No population rule,
archive deletion or combat mechanic is adopted by this document.

## What must happen before combat

| Item | Recommended disposition | Evidence needed to close it |
|---|---|---|
| Population policy | Complete before 4A, following the user's chosen sequence | Adopt/amend [decision bundle A–E](POPULATION_RENEWAL_DESIGN.md#recommended-decision-bundle--2026-10-16-pending-adoption), then implement bounded autonomous NPC families |
| Private NPC consent and explicit parent commands | Complete | Two-sided trust/affection, refusal, same-sex support, biological limits, stable anchors; no player-observer substitution |
| Archive recovery | Complete the lossless contract before renewal | Complete deceased records, genealogy, notebooks, F8 and pending heir restoration round-trip through v5; no removed history |
| Compaction and larger budgets | Explicitly defer | Retain 256 total records and existing save/parser/event limits; archival is not extra capacity |
| Scheduler and long population runs | Complete before calling renewal ready | Fixed seeds, ordinary/refuge boundary equivalence, repeated restarts, failures/extinctions/capacity and measured cost/size |
| Natural play balance | Complete or explicitly defer before 4A starts | Unassisted survival, travel, partner discovery, courtship and competing NPC commitment; controlled scripts do not establish this |
| Firefox/Safari, physical phones, assistive technology and abrupt termination | Explicitly defer for this bounded prototype | Keep these listed as unverified; emulated touch and normal Chromium restarts have narrower coverage |
| Graphical family tree, adoption, immigration, indefinite renewal | Explicitly defer | Keep text register, current biological heirs/kinship, finite-population promise |

Renewal is a separate tested milestone, not an incidental combat feature. Do not
bundle all its implementation with 4A. If its metrics show poor replenishment,
report the failure and revisit pacing; do not weaken kinship, force parenthood,
erase ancestors or claim that the population problem is solved.

The minimum archive decision is to retain full deceased snapshots and all sources
in each export. Compaction is optional work later, not a reason to delay this
lossless contract. Human playtesting and browser/device coverage must be described
honestly whether completed or explicitly deferred.

## Phase 4A outcome: one readable, voluntary melee encounter

Recommend **nonlethal sparring** as the first combat milestone. The player can
invite one introduced, living adult citizen, exchange clearly telegraphed strikes,
defend or retreat, and return to the existing survival/family loop. It is an
optional test of geometry, controls and integration, not a new survival hazard.

Keep lethal assaults, combat permadeath, persistent injuries, hostility/factions,
witnesses, crimes, guards, penalties, soldiers and all civilization systems outside
4A. They need later separate plans. Existing natural/survival death and succession
remain functional. No loot, weapons, projectiles, skill tree or map expansion.

### Encounter rules proposed for adoption after Phase 3.5

- Put **Invite to spar** in the currently three-choice Talk submenu as its fourth
  choice; retain all existing root choices, Romance, Family and Details. A brief
  acceptance/refusal uses ordinary public information and current needs, not
  attraction, private ancestry or the F8 view. A refusal consumes no combat state.
- Require two living adults with health 35+, food/water 30+ and stamina 30+.
  Invitation uses the existing safe approach/cancellation path. It cannot apply
  damage during approach. Recheck participants, distance and line of sight at
  acceptance; no teleporting or added player autopilot during combat.
- One encounter and one opponent at a time. No ambient aggression or NPC-vs-NPC
  combat. Opponent AI alternates a readable wind-up, strike and recovery using
  deterministic timers. Idle citizens keep their existing needs/navigation.
- Desktop: propose **J** for a single strike and hold **K** to defend, with touch
  equivalents. Movement/sprint provides retreat. Add an explicit End spar control.
  These controls do not replace gathering, eating, drinking, rest or social keys.
- A strike has a facing arc, finite range, wind-up, one hit per swing and recovery.
  Terrain blocks it. Defending reduces frontal damage while draining stamina;
  attacks cost stamina, and exhaustion cannot bypass recovery. Use fixed-step
  simulation, not render frames or key-repeat events, to resolve hits.
- Use one pure combat-profile function based on **visible body contour/form**.
  Triangle tips trade a narrower hit arc for reach; blunt polygons trade reach for
  a broader arc; visible line forms get a fixed line profile. Do not inspect a
  woman's hidden side count, latent sharpness or carrier state to calculate her
  combat stats. Rank and social prestige give no damage/defense multiplier.
- Initial tuning proposal: wind-up 0.35 s, recovery 0.65 s, strike stamina 12,
  frontal defense reduces damage by 60% and spends 8 stamina per blocked hit;
  base hit damage 8. Derive all reach from visible body bounds plus a small capped
  extension, and show the actual threatened area. Establish exact profile ranges
  in the pure-rules checkpoint; numbers remain proposed until tested/adopted.
- At health 1, stamina exhaustion, End spar or sustained escape beyond engagement
  range, end safely. Damage never lowers either sparring participant below 1.
  Keep spent health/stamina; existing supplied refuge healing recovers the player.
  No permanent wound record, romance reward, trust penalty or forced consent.
- Both encounter participants suspend ordinary rest/resource actions while
  sparring. Family year advancement requires ending the encounter. Opening a
  citizen bubble, Family, Pause, Help or F8 freezes all encounter timers exactly
  like other world time. Closing a menu returns to the frozen encounter without
  buffered attack input; End spar remains available. Selecting an ordinary social,
  rest or resource action ends practice before that action starts, so two approach
  controllers cannot compete. Simply inspecting or saving does not end practice.
  Blur clears held inputs.
- Missing/dead participants, natural death, succession, new game or load cancel
  the encounter and any approach/swing. Existing death/successor handling runs
  once, even when a death occurs on the same step as an attack. No minor, corpse,
  spouse or descendant is replaced or removed to make the scenario work.

Display a small health/stamina readout, wind-up cue, hit/defend feedback and retreat
hint. Reuse Canvas and the existing touch layout; no rules wall in ordinary
dialogue. Normal menus and combat feedback must not reveal undiscovered names,
NPC private relationships or female heredity.

## Persistence and implementation boundaries

Reuse the registry, navigation and the explicit shared death pathway. Combat
commands resolve stable IDs each step; no durable array-index references or
duplicate character ownership. Pure profile/hit rules must be separate from
input, rendering and opponent decisions. Add only the modules required by these
boundaries to the existing HTML assembler and dependency-free harness.

Persist existing health/stamina through the normal full character snapshot.
For this nonlethal milestone, encounter/target, attack wind-up, recovery and input
holds are transient. Saving is allowed during sparring; restoring loads the same
world and vitals paused, with the spar ended and no pending strike. Explain that
behavior in Help. This deliberately permits ending practice by loading, without
introducing a new hostility or injury schema. A later lethal milestone must
revisit that contract before implementation. Keep the then-current renewal schema,
original browser keys, world generator and v1–v4 readers.

## Three bounded, tested commits after the entry gates

1. **Pure melee rules.** Visible profiles, facing/range/terrain rejection, stamina,
   wind-up/recovery, defense and nonlethal damage. Fixed-seed fixtures include
   triangle, regular polygon, irregular polygon and line-form adult heirs.
   Tests prove identical line combat profiles for different hidden genomes and
   carrier states, one hit per swing and consistent fixed-step timing.
2. **Playable sparring.** Invitation/approach, one opponent controller, strike,
   defend, retreat/end, concise feedback and desktop/touch controls. Cover refusal,
   cancellation, exhausted actors, blocked attacks, menu/blur/F8 pausing and safe
   interaction with survival and family UI. Inspect screenshots at desktop,
   portrait and short landscape sizes.
3. **Persistence and generational regression.** Native Save/Continue/export/import
   during an encounter; exact retained vitals with no restored queued strike;
   legacy and renewal-enabled/disabled saves; natural death/pending heir and
   daughter succession. Update QA/rules/status/handoff and rebuild standalone HTML.

Every commit must keep build agreement, document references, all existing rule
cases and all seven existing Chromium scripts passing, with meaningful new combat
cases and a browser combat suite. Do not raise counts by retelling check groups
as individual tests. Keep fixtures frozen and raw evidence local/ignored. Stop
and fix a failing milestone before proceeding.

## 4A acceptance and stop boundary

An isolated browser scenario must invite an actual adult, show real movement into
range, strike, defend, exhaust stamina, retreat, recover at a refuge and save/load.
Repeat as a daughter heir with a line body. Test contact/terrain at world corners
and touch layouts. Verify bubbles, parenthood willingness and F8 read-only payloads
as well as combat. Keep controlled setup versus natural-play evidence distinct.

The milestone is complete when that encounter is readable and reversible without
corrupting survival, family, renewal or persistence. It does not complete the full
roadmap's Combat & Law phase. Propose later lethal combat/injuries and legal
aftermath separately; do not add them to close 4A.

## Baseline and next-session handoff

On 2026-10-16, before design edits: build agreement, document checks and all 63
deterministic cases pass at `a54a872`. All seven existing real Chromium scripts
pass; no page exceptions were reported. See [QA](QA_REPORT.md) for scope/limits.
The browser sandbox denied the first launch; isolated runs outside the sandbox
passed with Chromium 149.0.7827.55. No normal browser profile or save was opened.
PR #1 still points at `87feb3c`; local work has not been pushed.

> Continue The Flatland on `codex/phase-2b-3-generations`, PR #1. Inspect Git status
> and recent commits first. Read README and docs/ROADMAP, PHASE35_HANDOFF,
> POPULATION_RENEWAL_DESIGN, PHASE4A_PLAN, FAMILY_RULES, QA_REPORT and
> IMPLEMENTATION_STATUS. The tested gameplay checkpoint is `a54a872`; later design
> commits do not implement renewal or combat. The user selected renewal/archive
> design first. Check the conversation for explicit adoption/amendments to bundle
> A–E; do not treat the recommended rules as adopted. Validate baseline, then
> implement renewal in separate tested commits only after those decisions are
> settled. Preserve saves, stable IDs, ancestry privacy, bubbles, succession,
> read-only F8, relationship-dependent parenthood and standalone HTML. Keep full
> deceased records and caps unless a later explicit decision changes archival.
> Keep Phase 4A to the approved bounded melee scope after its entry gates; law,
> guards and civilization remain outside. Record evidence/limits and commit each
> passing milestone. Do not push or merge merely because PR #1 exists.
