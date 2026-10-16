# Phase 3.5 completion and bounded Phase 4A combat proposal

## Current entry decision — 2026-10-16

Continue from merged `main` at `b8caef8` on new branch
`codex/phase-4a-sparring`. PRs #1 and #2 are merged; the older branch prompts
below are historical and must not be resumed. The clean merged baseline passes
82 rule tests, all ten Chromium suites, build agreement and documentation links.
Test-owned profiles and localhost servers were used; normal saves were untouched.

The user explicitly chose: “Explicitly defer the human playtest for bounded
Phase 4A; keep it documented as unverified.” This closes the entry decision,
without providing human balance evidence. Unassisted survival, travel, partner
discovery, courtship and competing NPC commitments remain unverified. The bounded
nonlethal proposal below is the implementation scope; law, guards, civilization,
lethal attacks and lasting injuries remain outside it.

First checkpoint: pure contour profiles use triangle extension 22 / half-arc 0.5
radians, polygon 14 / 1.0, line 18 / 0.75. Reach is the sum of the participants'
visible bounding radii plus the attacker's extension. Line radius is a fixed 17
times visual life-stage scale. All profiles use 21 fixed wind-up ticks, 39 recovery
ticks, 12 strike stamina, 8 damage, 60% frontal mitigation costing 8 stamina, and
6 stamina/second held guard drain. Wind-up facing is locked. Contact also needs
clear terrain. No genome or prestige is passed into the profile function.
Encounter and input state stay transient; save schema and generator stay v5/v1.

**2026-10-16 · design only.** Baseline `a54a872` on
`codex/phase-2b-3-generations`, continuing
[PR #1](https://github.com/PakingPie/Flatland-A-Web-Based-Game/pull/1).
The user subsequently adopted renewal bundle A–E. Its bounded renewal and
lossless v5 archives are now implemented and tested. Combat mechanics below
remain proposed; no archive deletion or combat is implemented.

## What must happen before combat

| Item | Recommended disposition | Evidence needed to close it |
|---|---|---|
| Population policy | Implemented in v0.3.2, following the chosen sequence | [Bundle A–E](POPULATION_RENEWAL_DESIGN.md#adopted-decision-bundle--2026-10-16) adopted; deterministic/browser and census evidence recorded in QA |
| Private NPC consent and explicit parent commands | Implemented and tested | Two-sided trust/affection, refusal, same-sex support, biological limits, stable anchors; no player-observer substitution |
| Archive recovery | Verified in v5 | Complete deceased records, genealogy, notebooks, F8 and pending heir restoration round-trip through v5; no removed history |
| Compaction and larger budgets | Explicitly defer | Retain 256 total records and existing save/parser/event limits; archival is not extra capacity |
| Scheduler and long population runs | Verified bounded behavior; extinction remains possible | Fixed seeds, ordinary/refuge boundary equivalence, repeated restarts, failures/extinctions/capacity and measured cost/size |
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
cases and all ten existing Chromium scripts passing, with meaningful new combat
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
At that planning baseline PR #1 pointed at `87feb3c`. The updated handoff and
Git history record the subsequent implementation checkpoints.

> Continue The Flatland on `codex/phase-2b-3-generations`, PR #1. Inspect Git status
> and recent commits first. Read README and docs/ROADMAP, PHASE35_HANDOFF,
> POPULATION_RENEWAL_DESIGN, PHASE4A_PLAN, FAMILY_RULES, QA_REPORT and
> IMPLEMENTATION_STATUS. Bundle A–E is adopted and bounded renewal/lossless v5
> archives are implemented; do not ask to reapprove them. Validate the current
> baseline with all eight browser suites. The human balance playtest is still
> uncompleted and unwaived; obtain its report or explicit deferral before combat.
> Preserve saves, stable IDs, ancestry privacy, bubbles, succession, read-only F8,
> relationship-dependent parenthood and standalone HTML. Keep full deceased
> records and existing caps. Use this bounded nonlethal melee proposal after its
> entry gates; keep law, guards and civilization outside. Commit tested milestones,
> retain raw evidence locally, and do not push or merge merely because PR #1 exists.
