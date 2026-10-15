# Phase 2B + 3 implementation checkpoints

## Phase 3.5 family boundaries and integrity checkpoint

Family commands remain in `FamilySystem`; pure genetics, observer notebooks,
household support and the family presentation DTO now have separate boundaries.
Succession archives personal discoveries without sharing them with a new observer.
Explicit genealogy validation enforces reciprocal parent/child links and strictly
increasing generations, ruling out ancestry cycles. V4 imports now reject stored
spouse/history bonds that disagree with reciprocal marriage records; legacy
marriage imports still acquire bonds through their schema migration.

All 59 deterministic cases and all four Chromium suites pass. New corruption
cases cover invented, duplicated and one-sided spouse bonds, missing marriage
history and ancestry cycles. Observer-isolation and the frozen v4 payload pass.
Household rates, inheritance, courtship and population rules are unchanged.

## Phase 3.5 save-boundary checkpoint

`SaveCodec` parses and validates candidates without a DOM, browser storage or an
active game. The format contract, character validators and explicit schema readers
are separate source fragments. `SaveStore` retains native slot selection, fallback,
file I/O and transactional installation. No schema/key/generator version changes.

All 53 deterministic cases pass. New isolated-VM tests decode released v2/v3/v4
fixtures without browser globals, preserve source envelopes, and exercise the old
v4 observer-ID fallback. Exact released-v4 payload and existing failure/slot tests
pass. All four Chromium suites and deterministic build checks pass after extraction.

## Phase 3.5 registry checkpoint

One private `CharacterRegistry` owns all persistent records by stable ID. World
NPCs are a living projection; deceased characters remain available to genealogy,
kinship checks, observer sources, marriage history and complete v4 snapshots.
Births register identities, succession changes the selected ID, and candidate
restoration replaces the registry only after duplicate checks. No IDs are reused.

All 51 deterministic cases and all four Chromium scripts pass, including the
exact released-v4 payload, dead-founder succession, deceased knowledge sources,
duplicate-ID rejection and transactional registry replacement. Build/document
checks pass; action bubbles and legacy fixtures remain compatible.

## Phase 3.5 baseline and released-save checkpoint (2026-10-15)

Started clean on `codex/phase-2b-3-generations` at `87feb3c`. Build agreement,
documentation links, all 48 original deterministic cases and all four Chromium
browser scripts pass before architecture edits. Browser processes require an
unsandboxed run with explicit installed Chromium and isolated test profiles.

Frozen a released-v4 fixture by executing source from `87feb3c`, with daughter
succession, births, deaths and an archived observer. Its full payload round-trip
adds a 49th passing deterministic case. Legacy v2/v3 fixtures and the original
standalone baseline remain untouched. Population direction selected by the user:
design autonomous NPC families first; no renewal rule is adopted yet.

## Recovery / checkpoint A (2026-10-15)

Started from stable main `6e565b7`. Refreshed origin; the interrupted branch
`feature/phase-2b-3-families` still ends at `f7b5ea9` and contains only the
manual, read-only build verification workflow. Reused that file without merging
the divergent branch. The checkout was clean; no stash or additional family
implementation was available. No source archive or old gameplay harness exists
in this checkout.

Baseline build agreement and documentation link checks passed. A reproducible
browser smoke script uses an isolated profile and native localStorage. Artifacts
and temporary browser profiles stay under ignored the ignored browser output directory.

Next checkpoints: B courtship/marriage; C genetics/birth; D aging/succession;
E migration hardening, browser validation, documentation, final build.

## Checkpoint B — courtship and marriage

Romantic preferences, independent attraction, social expectations, affection,
varied courtship, acceptance/refusal, proposals, separation and marriage history
are operative. Same-sex spouses receive the same household metabolism/rest
benefits. Courtship shares the existing social cooldown and six-exchange daily
budget, with its own three-action cap and diminishing returns. Marriage does
not disclose private ancestry. Pair records use stable IDs.

Seven deterministic tests pass, including same-sex marriage, rejection at high
trust, cooldowns, marriage round trips and genuine v2 migration. The v2 fixture
was produced by executing source from stable commit `6e565b7`, with controlled
inventory/resource/discovery changes. It is not a fabricated current-schema save.
Native Chromium save/shutdown/reopen/Continue passed for the baseline and B build
using a fresh isolated profile and the test-owned localhost server.

## Checkpoint C — inherited genomes and birth cohorts

Explicit geometry stages, vertex proportions, latent ancestry, biological parent
IDs and generations now travel with every genome, including line-form daughters.
Inheritance is pure and seeded; pre-regular triangles cannot gain sides or skip
stages. Maternal carriers can reintroduce irregularity. Irregular polygons retain
their side count while repairing regularity. Ordinary regular inheritance gains
at most one side. Body size, mobility and metabolism vary independently of rank.

Mutually consenting adult opposite-sex spouses can produce cohorts of 2–4 unique
individuals. Birth cooldowns, reproductive age and population budgets are enforced.
Schema v4 stores dynamic individuals and validates reciprocal biological links;
v1/v2/v3 continue through the legacy identity-validation path. Fourteen tests pass,
including deterministic genetics samples, births, female genomes, remarriage and
snapshot restoration. Aging, family presentation and control transfer follow in D.

An external checkout switched to main after B. The committed B branch was retained;
in-progress edits were backed up locally and resumed on the implementation branch.

## Checkpoint D — playable generations

One survival day ages each living character one year. Refuge advances process
one or five years without replaying survival frames; community subsistence keeps
needs coherent and preserves packed supplies. Adulthood is 18, retirement opens
at 40, reproductive age is 18–60 and natural lifespan is deterministically 78–92.
Only living adult biological descendants can inherit control. Death with only
minor descendants ends the playable lineage; there is no automatic guardianship.

The paused family register displays observed traits, parents, children, siblings,
marriages, deaths and playable history without disclosing latent female geometry.
Succession transfers control in the existing world, archives the old observer's
notebook/reputation and retains siblings and retired founders as independent NPCs.
Death closes active marriages; adult heirs can be selected after death or retirement.

Twenty deterministic tests pass, including sons and daughters, mortality,
extinction/minor policy, independent siblings, family integrity and a female heir
bearing Generation 3. Real Chromium 149.0.7827.55 completed UI courtship, marriage,
cohort birth, maturation, daughter succession, continued movement and a further
birth. Two full browser shutdown/reopen cycles preserved exact saved payloads.
QA hooks controlled proximity, clock and needs, and located consenting partners;
relationship gains, births and succession used game rules and UI buttons.
Desktop 1440×900 and phone-width 390×844 family screenshots were inspected locally.
No page exceptions were observed. Artifacts remain in ignored local output.

## Checkpoint E — final build, migrations and regression hardening

Version 0.3.0 is assembled from source with schema v4 and unchanged generator/slot
keys. Portable native JSON export/import validates transactionally and preserves
browser slots until saving. Genuine v2 and v3 fixtures are committed, plus a clearly
identified synthetic v1 migration test. Hidden female carrier defaults use an
independent identity stream without perturbing terrain or survival RNG.

Final deterministic result: 44 passed, zero failed. Three real Chromium scripts
pass: native smoke, eight generation/storage/death check groups, and nine survival,
touch and migration check groups. The latter includes twelve viewport/corner
clearance cases. Full current characters, including retired NPC appearances, round
trip after succession. Refusing an outing cannot corrupt an existing marriage.
Death with pending heir selection is restorable after a full browser shutdown.

README, roadmap, current/historical QA, balance rules and Phase 3.5 handoff are
updated. The recovered manual read-only workflow now also runs documentation and
deterministic rules checks. The untouched Phase 1 baseline has no diff. Local
generated evidence and browser profiles remain ignored.

Known limitations: finite aging founding population (no autonomous reproduction or
immigration), abstract immediate births, compact register, 256-individual/2 MB
budgets, and no Firefox/Safari/physical-phone or long unassisted human session
validation. These limits do not affect the verified Generation 2 control and
Generation 3 births. See [current QA](QA_REPORT.md) and [handoff](PHASE35_HANDOFF.md).

## Usability follow-up — action bubbles (v0.3.1)

Approved direction: a small citizen action bubble, brief character dialogue and
automatic approach. Routine choices pause the world; selecting one resumes time
and navigates using existing collision/pathfinding. Menus expose at most four
choices. Details retains source-aware knowledge; replies omit explanatory rules.
Movement, Escape, pause or Cancel safely cancel queued actions. The queue is
transient, so loading never resumes an obsolete UI click.

The start screen has one premise line; contextual prompts teach controls. Family
rows and history use optional expansion. Save schema v4, all stable IDs, original
rule fixtures and the generational loop remain. Forty-eight deterministic tests
and four real-browser scripts pass, including the new five-group bubble suite,
the full generation scenario, native persistence and survival/touch regressions.
Evidence stays local and ignored. This is a presentation/control pass, without
Phase 3.5 population or architecture expansion.
