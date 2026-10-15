# Phase 2B + 3 implementation checkpoints

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
