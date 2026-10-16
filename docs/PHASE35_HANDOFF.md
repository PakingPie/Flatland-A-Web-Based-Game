# Phase 3.5 architecture handoff

## Current checkpoint — 2026-10-16

Gameplay remains at `a54a872` (parenthood willingness), with a clean checkout and
seven unpushed commits at session start. PR #1's remote head is still `87feb3c`.
The 2026-10-16 baseline rerun passes build/docs, all 63 deterministic cases and all
seven Chromium scripts. Design documentation is a separate local milestone.

The user confirmed **resolve renewal and archive design first**. Review the
[recommended decision bundle A–E](POPULATION_RENEWAL_DESIGN.md#recommended-decision-bundle--2026-10-16-pending-adoption)
before implementing renewal. It proposes full deceased snapshots in v5, unchanged
caps, explicit activation for legacy saves, mutual private NPC consent, stable
lineage-aware anchors and bounded yearly events. Only the sequence is selected;
the numerical rules, anchor policy and new-game defaults still await adoption.
The [Phase 4A plan](PHASE4A_PLAN.md) gives completion/deferral gates and proposes
voluntary nonlethal sparring after renewal, excluding law, guards and civilization.
No renewal, compaction, save-format change or combat has been implemented.

## Architecture implementation history

Core architecture hardening is implemented on `codex/phase-2b-3-generations`,
continuing PR #1 from clean checkpoint `87feb3c`. Tested commits:

- `46ab6f5`: baseline evidence and frozen released-v4 family save.
- `831a9a5`: stable character registry and living/deceased separation.
- `743130c`: storage-independent save codec and explicit v1–v4 schema readers.
- `14b9fdf`: family DTO, observer notebooks, household support and integrity checks.
- Follow-up at branch HEAD: incremental family rows, architecture browser checks,
  population-budget stress and the NPC-family design discussion.

Action bubbles, paused choices, automatic approach, stable IDs, hidden ancestry,
legacy fixtures, original slot keys, save v4, generator v1 and standalone HTML are
preserved. No normal player storage is used in validation. Combat, law and
civilization remain outside this phase.

## Implemented boundaries

| Boundary | Responsibility |
|---|---|
| Character registry | Private records by stable ID; living actors are a projection; death retains genealogy |
| Family commands | Births, deaths, aging and succession update the same registry and event records |
| Genetics | Pure seeded biological inheritance independent of rendering |
| Observer notebooks | Archive and restore personal knowledge/reputation during control transfer |
| Household support | Derived marriage benefits independent of biological parentage |
| Family view | Small observer-facing DTO; no hidden genomes or carrier state |
| Save codec/validation | Parse an envelope and build a fully validated candidate without DOM/storage/game access |
| Schema readers | Explicit released-v1/v2/v3/v4 restoration; no rewriting input or slots |
| Save store | Native storage, file I/O, slot fallback and transactional installation |
| Family screen | Keyed row updates retain expanded details and DOM identity |

Generation ordering proves the family graph is acyclic; parent/child links must
be reciprocal. V4 spouse bonds must agree with marriage history. The registry has
no removal path for referenced ancestors; deceased records still count toward the
256-record limit. Full deceased runtime and archived notebooks remain stored.

## Current validation

Build agreement, documentation links and 63 deterministic cases pass. All seven
Chromium scripts pass: smoke, generations (8 groups), bubbles (5), preservation
(9), architecture (7), inspector (6), parenthood (4). The architecture suite includes native released-v4 loading,
three Continue cycles/two complete browser restarts, preserved family row expansion,
injected Storage quota/denial, and a genuine cross-tab storage event. The
population stress test fills the record budget, kills non-household actors and
proves deaths do not free IDs/capacity or consume RNG on refused births.

Browser execution uses explicit installed Chromium and an unsandboxed process,
with fresh test-owned profiles and localhost servers. Generated JSON, screenshots,
exports and profiles stay under ignored local output. Failure injection is not
physical disk exhaustion. Existing gameplay suites still control clock, needs,
proximity and compatible candidate discovery.

## Population discussion before renewal rule changes

The user selected **design autonomous NPC families first**. Read the
[concrete proposal](POPULATION_RENEWAL_DESIGN.md). Direction is selected; pacing,
NPC needs/consent, inheritance anchors and activation for existing saves are not
adopted. No autonomous reproduction or immigration is implemented.

The proposal starts with bounded yearly matching/births and separate private pair
state and RNG. A closed population cannot guarantee unrelated partners forever
under the existing shared-ancestor rule and record/save limits. Do not silently
weaken kinship, delete ancestors or promise unlimited generations. Discuss the
proposal with the user before implementing population rules.

The later user-approved parenthood follow-up lets hesitant spouses reconsider
through trust/affection support and adds Discuss children. It applies to existing
playable couples, uses no new save fields and needs no new game. This does not
adopt the separate autonomous NPC-family proposal. See [current rules](FAMILY_RULES.md).

## Remaining work and limits

1. Adopt population rules before implementing NPC households. Generalize parent
   commands and consent without borrowing the current observer's relationships.
2. Adopt and verify the proposed lossless archive contract before increasing
   population churn. Full deceased snapshots stay in each export; compaction and
   larger budgets are recommended explicit deferrals. Existing limits remain 256
   total records and a nominal 2 MB envelope; the current parser checks string
   units, so v5 byte accounting needs an explicit compatibility-preserving change.
3. Complete an unassisted human survival/courtship/travel playthrough. Controlled
   browser integration is not evidence of natural partner discovery/balance.
4. Expand to Firefox/Safari, physical mobile rotation, assistive technology,
   abrupt termination and long-session durability. Repeated controlled Chromium
   resumes and emulated touch do not establish those environments.
5. Consider a compact graphical tree only when population size and playtesting
   justify it. Current keyed text rows retain concise expandable relationships.

The user-requested F8 inspector is an explicit testing exception to ordinary
disclosure: it pauses time and shows private truth without teaching discoveries
or changing saved state. F8/Escape returns to normal and clears private details.
Pause → Testing supports touch; the view is transient and does not require the
optional debug API. Use it for inspection, not as evidence of natural discovery.

## Ready-to-copy next-session prompt

> Continue The Flatland Phase 3.5 on `codex/phase-2b-3-generations`, PR #1. Inspect
> Git status and recent commits first and preserve existing work. Read README and
> docs/PHASE35_HANDOFF, ROADMAP, FAMILY_RULES, QA_REPORT, IMPLEMENTATION_STATUS,
> POPULATION_RENEWAL_DESIGN and PHASE4A_PLAN. Gameplay checkpoint `a54a872` passed
> 63 deterministic cases and all seven Chromium scripts on 2026-10-16. Later design
> documents are not implemented rules. The user selected renewal/archive design
> first: check for adoption/amendments to bundle A–E in conversation before
> implementing its staged milestones. Rerun build/docs/rules/browser baseline.
> Preserve saves, stable IDs, hidden ancestry, bubbles, succession, F8, current
> relationship-dependent parenthood, original slots and standalone HTML. No
> archive deletion, kinship relaxation or unlimited-population promise. Finish
> renewal and record all Phase 4A entry gates before combat; 4A is proposed as
> nonlethal sparring only. Keep law, guards and civilization outside that milestone.
> Commit tested milestones, retain raw evidence locally, and document limits.
