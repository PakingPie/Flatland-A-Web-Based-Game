# Phase 3.5 renewal handoff

**Family-bond follow-up, v0.3.4:** approved initial bonds and parent/child/sibling
labels now use known birth events and derived support over saved personal scores.
Parents/children start at 48 familiarity / 20 trust support, siblings at 36/12;
negative personal experience can still overcome support. No secrets are inherited,
no raw save fields are changed, and direct relatives have no romance choices.
Current validation is 80 deterministic cases and nine Chromium scripts. Growth
stages are only a proposal (0–5 days 45%, 6–17 70%, 18–64 100%, 65+ 85%, visual
first); the user requested a recommendation and has not adopted those details.


**Presentation follow-up, v0.3.3:** known living family now have gold dashed halos
and minimap dots. Hidden biological connections remain unmarked. All user-facing
ages and time labels use days: one day remains 120 simulated seconds and adds one
unit of age. No migration or numeric balance change; old save/API year field names
stay compatible. Event dates are one-based like the HUD. Current validation is
78 deterministic cases and nine browser scripts, including the Canvas/privacy/day
presentation suite. Earlier renewal/census evidence below uses its historical
year vocabulary. The human playtest gate before combat is still uncompleted and
unwaived.


## Current state — 2026-10-16

The user adopted population decision bundle A–E after design checkpoint `8389cfa`.
The approved implementation has three separate milestones: `f8f8b79` freezes the
`a54a872` save and extracts explicit parents/readiness; `aa447b6` adds lossless v5
archives and transactional cohort preflight; the following renewal checkpoint
adds the scheduler, private relationships, policy UI and population evidence.
The branch remains `codex/phase-2b-3-generations`, continuing PR #1. The upstream
tracking ref was already at `8389cfa` when implementation began; these new commits
have not been pushed by this session.

V0.3.2 now supports autonomous NPC families. New expeditions enable renewal;
existing v1–v4 saves load disabled, without rewriting the input or slots. The player
can export a backup and explicitly enable/disable it from Pause → Population &
families. Changes start at the next family year, without catch-up. Disabling keeps
all existing people and history.

Action bubbles, paused choices, approach/cancellation, stable IDs, private ancestry,
relationship-dependent playable willingness, sons/daughters, succession, read-only
F8 and the standalone HTML remain. The world generator and browser slot keys are
unchanged. Schema v5 retains full deceased snapshots and observer sources; old
executables reject v5 exports, so keep pre-upgrade exports. Compaction, increased
budgets, immigration and indefinite renewal remain deferred.

## Implemented boundaries

| Boundary | Responsibility |
|---|---|
| Registry | One stable-ID record per person; living actors are a projection; no ID reuse |
| Family cohort commands | Detached explicit-parent/anchor planning and full candidate-save validation before publication |
| Shared clock | Ordinary/refuge years split at boundaries and natural deaths; player death suppresses later events |
| Renewal | Saved policy/cursor, matching/birth RNGs, private directed relationships, household anchors/cohort counts |
| Discovery | Private NPC events do not teach the observer names or ancestry; consenting household sharing has source provenance |
| Observer transfer | Archive personal knowledge; a married NPC heir retains their own experienced household |
| Family DTO/UI | Known family only; otherwise unknown adult heirs are selectable anonymously without disclosing private traits |
| Save codec | Storage-independent v1–v5 validation, complete dead-record recovery and transactional import |
| F8 | Paused, transient private truth including NPC pairs/anchors; no discoveries, RNG or saved-mode changes |

The adopted rules remain in [the population design](POPULATION_RENEWAL_DESIGN.md)
and the [implemented family rules](FAMILY_RULES.md). At most one new courtship,
marriage and NPC cohort occur per year. Mutual private trust/affection progresses
10/12 per successful yearly evaluation; commitment requires four evaluations.
Background needs use abstract subsistence without refilling ordinary meters.
Both parents must be willing and biologically eligible. Two autonomous cohorts
per marriage; room for four children under 96 living / 248 total records. Player
birth rules and the global 256-record cap remain. Refused additions preserve IDs,
birth RNG, cooldown and discoveries. No ancestry deletion or weakened kinship.

## Validation and limits

The [QA report](QA_REPORT.md) records the deterministic suite, all nine isolated
Chromium scripts and the 20-seed / 100-year demographic study. Native v5 shutdown and
Continue, original v1–v4 fields, dead records, notebooks, pending heirs, daughter
anchors, policy controls, F8 and standalone opening are covered. Population and
browser artifacts remain under ignored local output; no normal player save or
profile was used.

The census continues after founder extinction without reviving or replacing any
character; it is not a successfully played dynasty. First cohorts occurred in
years 6–17; two seeds lost all living people by year 100. Peak living/total records
were 87/139. Peak envelope size was 373,393 bytes and 20,189 tree nodes. No capacity
refusals arose in that small census; separate capacity/large-notebook fixtures test
refusal. Year callback timing under concurrent QA load was median 159 ms, p95
376 ms, maximum 590 ms. This is a bounded prototype, not a frame-rate guarantee;
optimization remains a documented follow-up within the existing caps.

The unassisted human survival/travel/courtship/competing-commitment playtest is
**not completed or waived**. Controlled QA does not satisfy it. This is the
remaining decision/evidence gate before combat. Firefox/Safari, physical mobile,
assistive technology, abrupt process-kill and long human sessions remain deferred
and unverified. Text genealogy remains; no graphical tree or adoption.

## Phase 4A boundary

The [Phase 4A plan](PHASE4A_PLAN.md) remains a bounded proposal: voluntary nonlethal
sparring, one opponent, visible-shape attacks, defense and retreat, delivered in
three tested commits. No combat is implemented here. Obtain the human playtest
report or an explicit deferral before beginning that milestone. Law, guards,
soldiers, civilization, lethal attacks and lasting injuries stay outside 4A.

## Ready-to-copy next-session prompt

> Continue The Flatland on `codex/phase-2b-3-generations`, PR #1. Inspect Git status
> and log first. Read README and docs/ROADMAP, PHASE35_HANDOFF,
> POPULATION_RENEWAL_DESIGN, FAMILY_RULES, QA_REPORT, IMPLEMENTATION_STATUS and
> PHASE4A_PLAN. Bundle A–E is adopted and renewal is implemented; do not ask to
> reapprove it. Preserve the tested preparation/archive/renewal milestones and
> any parallel work. Rerun build/docs/rules and all nine Chromium suites before
> changing gameplay. Keep v1–v4 migration, v5 full deceased archives, stable IDs,
> ancestry privacy, bubbles, succession, F8, playable willingness, original slot
> keys and standalone HTML. New games enable renewal; legacy saves require explicit
> opt-in. The 20-seed census is demographic evidence, not human balance or unlimited
> renewal. Human survival/travel/courtship/competing-commitment playtesting is still
> uncompleted and unwaived: obtain its report or explicit deferral before 4A.
> Then use the bounded nonlethal sparring proposal, without law, guards or
> civilization. Commit tested milestones and document limits; retain raw evidence
> locally. Do not push or merge merely because PR #1 exists.
