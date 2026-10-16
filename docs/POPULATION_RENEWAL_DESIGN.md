# Autonomous NPC families — adopted rules and implementation

**Vocabulary update, v0.3.3:** the UI now calls the same 120-second family-age
interval a day, including ages, cooldowns and calendar history. The adopted
numerical rules below are unchanged. Historical year terminology and saved
field/API names remain compatible; this is not a new population policy.


**Adopted 2026-10-16:** the user approved decision bundle A–E below. It now governs
the staged implementation. Earlier proposal text remains design history; where
it is less specific, the adopted bundle takes precedence. The scheduler and v5 lossless format are now implemented and validated;
see the current QA and handoff for limits. Compaction, immigration, larger
budgets and indefinite renewal remain deferred.

**Decision recorded 2026-10-15:** the user selected **design autonomous NPC families
first**. This chooses the direction, not the rules below. At that checkpoint no renewal behavior was
implemented or enabled by the architecture commits.

**Sequence confirmed 2026-10-16:** resolve renewal and archive design before
combat. The recommended decision bundle below makes the remaining choices
concrete. The user subsequently approved bundle A–E, which is now implemented. See the subsequent
[Phase 4A plan](PHASE4A_PLAN.md) for the combat boundary and entry gates.

## Purpose and limits

Let citizens form households and raise children independently of the player,
so later generations can meet younger citizens from other founding families.
Keep existing courtship, private ancestry, biological inheritance and succession.
No immigration, adoption, combat, law or civilization systems are included.

This can extend population availability, but cannot promise unlimited generations.
The current kinship rule rejects any shared recorded ancestor. A closed population
eventually has overlapping ancestry; 256 total records and a 2 MB envelope impose
additional limits. Never erase ancestors, reset kinship or force reproduction to
manufacture a compatible partner. Extinction remains possible.

## Original proposal — historical context

| Concern | Proposed starting point |
|---|---|
| Clock | One deterministic household evaluation per family year, equally processed by ordinary time and refuge advancement |
| Matching | At most one new NPC marriage per year; living unrelated adults, mutual preferences/interest, no active spouse |
| Consent | Private pair-specific trust/affection; both choose commitment and parenthood; player trust/reputation must not stand in for either NPC |
| Player courtship | Existing marriage is protected. How NPC commitments interact with unfinished player courtship needs explicit playtesting and a brief visible response |
| Marriage | Same-sex households use the same commitment and support rules; biological eligibility stays separate |
| Birth | Opposite-sex spouses aged 18–60; both willing to raise children; existing two-year cooldown and 2–4 child distribution |
| NPC pacing | At most one NPC birth cohort globally per year and two cohorts per NPC household, initially |
| Population pressure | Defer NPC births if a four-child cohort would exceed 96 living individuals or 248 total records, leaving eight records for player births |
| Failure | No eligible consenting pair or no capacity means no event, with no forced match and no ID or inheritance-RNG consumption |
| Aging | Existing adulthood, natural lifespan, death/widowhood and biological heir rules remain |

The numerical pacing and limits are tuning proposals. The eight-record reserve
does not guarantee capacity indefinitely; player births can still reach the
existing global limit. NPC vital/needs eligibility also needs a deliberate choice:
background community subsistence or actual simulated needs, without granting that
support to the playable character outside the existing refuge rule.

## Required implementation boundaries

1. Generalize family commands to accept explicit parent/household IDs. Keep the
   current player commands as concise wrappers. Never temporarily swap the player
   to simulate an NPC family or write relationships into the player's notebook.
2. Build mutual NPC compatibility from private pair state. The present romance
   implementation consults the player's discovered relationship and reputation;
   calling it unchanged for two NPCs would use the wrong observer.
3. Persist an inheritance anchor per household. A proposed stable seeded choice
   between the two parents avoids preferring visible male geometry or switching
   anchors when the player changes. Female latent geometry remains inheritable.
4. Use a dedicated saved renewal RNG and year cursor, with stable ID ordering.
   Blocked checks must not consume survival or playable inheritance randomness.
   Evaluate year crossings once; save/reload and five single-year steps must match
   one five-year advance, including deaths and capacity changes in each interval.
5. Send births/deaths through the registry and shared family event commands.
   Generate unique IDs, reciprocal links, birth records and generation DAGs exactly
   as for playable families. Failed planning must not partially create a cohort.
6. Keep NPC facts private. Full simulation truth belongs in the registry/save;
   the observer learns public events through normal discovery. Stranger ancestry
   and female genomes must not appear in bubbles, notebooks or family DTOs.
7. Add a new schema for policy, scheduler, RNG and household state. Proposed legacy
   migration retains finite founding behavior until the player deliberately opts
   into the new policy. Default behavior for new expeditions and that opt-in need
   approval with the rules. Preserve frozen v1–v4 evidence and original slot keys.

## Archive and capacity prerequisite

Current hardening retains full deceased records and sparse observer archives;
it does not delete or compact history. Before enabling background births, choose
a recoverable archive format and test it against exports. Keep identity, sex,
private hereditary state, parent/child links, birth/marriage/death records, observer
provenance and playable history. Removing referenced ancestors is unacceptable.
Any removal of inert actor runtime should be explicit in the new schema, with
tests proving the same genealogy, privacy and continuation behavior.

## Acceptance evidence before enabling rules

- Fixed-seed tests for mutual refusal, same-sex marriage, no joint same-sex births,
  kinship, living/deceased registry separation, independent inherited children,
  observer privacy and transactional capacity refusal.
- Save/load at every scheduler boundary; legacy policy preservation; identical
  outcomes for continuous years, refuge years and repeated restarts. Existing
  playable birth RNG must remain unchanged while renewal is disabled.
- Headless multi-seed, multi-generation runs recording living population, eligible
  unrelated partners by sex/preferences, births, deaths, lineage extinctions,
  total records, save size and scheduler cost. Report failures as well as successes.
- An unassisted human survival/courtship playthrough to assess travel, discovery
  and competing commitments. Existing controlled browser scenarios do not cover it.

Bundle A–E below resolves pacing, background needs, inheritance anchors,
activation and the finite-population promise with user approval. A separate later
decision is required if indefinite renewal becomes a goal.

## Adopted decision bundle — 2026-10-16

The user adopted the five choices below together. They refine the earlier
proposal. The staged implementation preserves existing playable willingness
and inheritance while adding the specified private background behavior.

### A. Finite population, conservative pacing and activation

- Enable renewal by default only for **new expeditions** in the future renewal
  build. V1–v4 imports/Continue retain the founding-only policy. Offer an explicit
  Pause setting with an explanation and export option before enabling it in an
  existing expedition. Loading alone must never activate renewal or rewrite slots.
- Activation starts at the next integer family year, with no historical catch-up.
  Save a policy version, activation time, processed-year cursor and renewal RNG.
  Allow disabling future matching/births; retain all existing families and history.
  Re-enabling also starts at the next year, without replaying disabled years.
- Evaluate once per year. Start at most one new private courting pair and finalize
  at most one NPC marriage globally per year. Each citizen has at most one active
  background courtship. Existing player marriages remain exclusive and intact.
- Permit at most one NPC birth cohort globally per year and two autonomous cohorts
  per marriage. Remarriage creates a new household; it does not reset a surviving
  pair's cooldown. Playable births retain their current rules and have no new cap;
  all cohorts in that marriage count toward its autonomous two-cohort allowance.
- Before any NPC cohort, require room for four children at both **96 living** and
  **248 total records**. Keep the global 256-record cap. The eight-record reserve
  protects some player headroom, not unlimited births or guaranteed descendants.
  Death frees living capacity only. No immigration, adoption or relaxed kinship.

### B. Mutual NPC relationships and background needs

NPCs use private, directed trust and affection for each side of a pair. Start both
at zero; one eligible yearly shared-time evaluation adds 10 trust and 12 affection
per side, capped at 100. Commitment requires each side's trust 18+, affection 42+
and mutual compatibility. This makes the first possible marriage the fourth
successful evaluation; a newly formed marriage cannot also give birth that year.
These rates are initial tuning, to be checked against founding ages and extinction.

Use both characters' seeded sex preferences, spark and existing social-expectation
rules. For reputation-sensitive NPC evaluation, use the counterpart's saved public
reputation, never the current observer's reputation. Willingness to raise children
uses **each parent's** baseline and their own directed trust/affection, with the
same +0.08/+0.08 support formula and 0.30 threshold as playable willingness. Recheck
at the birth; stored marriage is not permanent parenthood consent. Reuse the
formula through explicit relationship inputs, while keeping the player wrapper's
current results identical. Same-sex commitment/support and biological restrictions
remain separate. Family readiness does not derive from rank or ancestry.

Retain existing NPC needs/navigation during ordinary play. For background family
evaluation, use abstract community subsistence rather than NPC food/water meters
that refuge skipping does not simulate. Do not refill ordinary NPC meters as a
side effect of evaluation or grant this support to the playable character. Both
parents must be alive and, for births, aged 18–60 with health 35+. Future injury
or illness rules must declare whether they block family events. Births keep the
current 2–4 distribution and two-year cooldown.

The current player is excluded from automated courtship/birth commands. Other
adults, including retired founders and unchosen siblings, may participate. An
unfinished player courtship does not reserve an NPC forever: a later mutually
chosen NPC marriage closes competing courtships. The next normal interaction
gives a brief commitment response without identifying an undiscovered partner.
No private NPC relationship state is copied into the observer notebook.

### C. Stable inheritance anchors that preserve playable lineage

Persist `anchorId` on each marriage/household, not on the current observer. If
exactly one parent is a biological descendant of the dynasty founder (including
the founder), choose that parent. Otherwise choose one of the sorted parent IDs
using a seed/household-specific hash and persist the result. Two founder-lineage
spouses share an ancestor and are already forbidden by kinship rules.

This deliberate dynasty preference preserves today's rule that a daughter carries
her own latent geometry forward, including if she marries while still an NPC and
is later selected as heir. Other families have no male/visible-form preference.
Changing control, widowhood or save/load cannot change an existing household's
anchor. A new marriage receives its own anchor. Legacy player-family marriages
derive the same founder-lineage parent without changing any existing child or
consuming RNG. Test and reject ambiguous/corrupt migrations instead of guessing.
This is a new proposed background policy, not an assertion that it already exists.

On selecting an NPC heir who already has a spouse, keep their existing marriage,
anchor, birth cooldown and cohort count. An explicit control-transfer adapter
initializes only that observer's experienced household relationship from the NPC
pair, with no stranger facts or another observer's notebook. Subsequent playable
actions update that relationship through the existing commands and willingness
formula. Cover retirement, death succession and save/reload of this case before
enabling it; unchanged legacy successions must retain their exact observer reset
and archived-notebook behavior. This new NPC-household case must not be handled by
temporarily making either parent the player during background simulation.

### D. Recoverable archival contract; defer compaction

Recommend a **lossless archive first**: keep the full existing character DTO for
every deceased individual in the canonical `characters` array in proposed schema
v5. The registry remains the single identity source; living actors are a derived
projection, not a second persistent identity collection. A deceased record is an
archive entry by life state. No separate archive file or external database is
needed to restore an export.

| Retained data | Recovery and privacy requirement |
|---|---|
| ID, identity, sex/body form, complete private genome/profile | Exact identity and hereditary truth; never reconstructed from public claims |
| Life/death state and reciprocal parent/child/generation links | Kinship checks, descendant traversal, death display and ancestry DAG |
| Public identity/claims and current observer's subject knowledge | Preserve observation versus claim versus rumor, including source IDs |
| Final position, orientation, vitals, AI and runtime snapshot | Retain current full-record inspection and legacy restoration semantics |
| Births, marriages, bonds, household anchor/cohort count, family history | Preserve event references and widowhood without creating a living actor |
| Archived observer notebooks/reputation and playable history | No loss or automatic inheritance of another observer's private knowledge |
| Next ID, all existing RNGs and renewal RNG/cursor | No ID reuse, reroll, duplicate event or continuation drift |

Keep the 256-record cap and existing save/parser/event budgets. Measure serialized
size **and** structural budgets before committing any cohort; four-record reserve
alone is insufficient for large notebooks. Current `maxBytes` parsing uses string
code units, not UTF-8 bytes. Add explicit UTF-8 accounting for new v5 writes while
preserving the legacy readers' acceptance behavior and original slot contents.
Do not silently tighten old imports or advertise the existing check as byte-exact.

Plan a cohort in a detached candidate with local copies of IDs/RNG/relationships;
validate the entire resulting save, then publish its records/events together.
Capacity refusal must leave cohort IDs, birth cooldown, birth counters and all RNG
states unchanged. A yearly cursor may advance past a blocked evaluation; that
prevents retries on reload and must be identical across time-advance paths. Storage
write failure retains the prior slot and visible error; in-memory state remains
exportable. Stop autonomous additions before a candidate breaches a budget rather
than silently dropping history. Apply the same transactional cohort seam to player
births without changing successful legacy outcomes.

Freeze a new v4 fixture from `a54a872` before changing the schema, alongside the
untouched released `87feb3c` v4 fixture. V5 adds renewal state and household data;
it does not need a new world generator or browser keys. Load v1–v4 into a validated
candidate with renewal disabled. Old executables will reject v5 exports, so keep
the pre-upgrade export; do not promise downgrade support.

Defer dropping dead AI/pose/runtime, notebook deduplication, compressed blobs,
external archives and increased record budgets. Any later compaction needs its own
schema and proof of equivalent genealogy, source provenance, normal disclosure,
F8 inspection and continuation. Lossless archival does **not** save space. In the
frozen released-v4 fixture, 67 records include four deceased records (8,776 UTF-8
bytes together); the compact envelope is 157,048 bytes. This small fixture does not
justify a large-dynasty compaction claim.

### E. Deterministic scheduling and discovery

Route ordinary time and refuge years through one year-crossing scheduler. Split
updates at boundaries; process aging/deaths and widowhood first, then existing
pair progress/marriages, then births in stable ID order. Newborns do not age for
time before their birth. Stop at the current player's death, before new renewal
events on that boundary; preserve pending heir selection. A five-year command must
match five one-year commands, including the precise stopping boundary.

Use separate saved renewal matching and birth RNG streams; do not consume survival,
conversation or playable-family RNG for background events. Persist the cursor and
RNG even if no event occurs, with blocked capacity checks before stochastic draws.
Stable enumeration alone would unfairly favor early IDs: select among eligible
candidates using the dedicated matching stream after validating capacity and
eligibility. Refusal checks themselves are pure. Document the draw order in tests.

Prove matching yearly family/renewal outcomes for the same boundary inputs across
ordinary-time, refuge and save/reload paths. Do not require equal whole-world
payloads: ordinary movement/needs/resource gathering intentionally differ from
abstract refuge time. Compare complete payloads only for equivalent execution
paths and controlled inputs.

Refactor player-only discovery before background births: `birth()` currently
teaches every child's name; `name()` treats every birth/marriage as known; the
family DTO treats recorded births as observed traits. Recording an NPC event must
not make its participants known to the observer. Keep event discovery/provenance
separate from private registry truth; legacy household knowledge stays visible.
Family views include only the observer's known family/events, not every NPC family.
An ordinary commitment reply can reveal its subject's marital status, not private
partner identity, ancestry, latent female geometry or directed trust. F8 remains
the reversible, read-only testing exception.

## Implementation sequence after design adoption

1. Freeze the current checkpoint fixture; extract explicit-parent cohort planning
   and explicit-relationship readiness; preserve all 63 baseline results and the
   seven browser suites. No renewal enabled in this commit.
2. Add the v5 lossless archive/household/policy contract and migrations, still with
   renewal disabled. Round-trip complete dead records, notebooks and pending heirs;
   test malformed anchors/cursors, transactional failures and legacy slots.
3. Add mutual NPC courtship, deterministic scheduler and bounded births behind
   saved policy. Test new-game defaults, legacy opt-in/off/re-enable and privacy.
4. Run multi-seed population evidence and browser integration; tune only within
   adopted bounds or return with measured changes. Commit each passing milestone.

Before calling renewal ready, run at least 20 fixed seeds for up to 100 family
years, recording living/dead/total population, courting/married pairs, births,
eligible unrelated partners by sex/preferences, time to first cohort, extinctions,
capacity refusals, envelope bytes/tree nodes and scheduler timings. Use a separate
headless demographic fixture to continue after playable extinction; label it as
simulation evidence, not a successful player dynasty. Include no-match/low-fertility
seeds and all failures. Report remaining headroom rather than requiring every seed
to survive indefinitely. A large-notebook budget fixture is required independently
of the small released save. Raw artifacts stay local under ignored output.

The full [Phase 4A entry checklist](PHASE4A_PLAN.md) also requires a natural
survival/courtship/discovery playthrough. Automated controlled scenarios cannot
fulfil the human balance check. A user playtest report or an explicit deferral is
needed before reporting that item complete.


## Implemented checkpoint and remaining gate

Preparation and lossless v5 archives were committed separately as `f8f8b79` and
`aa447b6`. The renewal implementation adds the shared year scheduler, Pause policy,
private NPC relationships/events, explicit cohort validation and control-transfer
adapter. Existing saves remain disabled until explicit opt-in. Normal discovery
can share a consenting subject's household names; it does not reveal their private
biological origin or female genome. F8 exposes private NPC pairs and anchors only
inside its reversible testing view.

Unknown adult descendants remain selectable through an anonymous succession
button without disclosing their names, parents or private traits in the current
observer's family register. Taking control restores their experienced household.
This prevents hidden background branches from trapping a pending heir choice.

The deterministic and browser evidence and the 20-seed / 100-year census are in
[QA](QA_REPORT.md). No human balance playthrough has been completed or waived.
Complete that report or obtain an explicit deferral before Phase 4A implementation.
Compaction, larger budgets, immigration and indefinite renewal remain deferred.
