# Autonomous NPC families — proposal for discussion

**Decision recorded 2026-10-15:** the user selected **design autonomous NPC families
first**. This chooses the direction, not the rules below. No renewal behavior is
implemented or enabled by Phase 3.5 architecture commits.

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

## Proposed first rules — not adopted

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

Approve pacing, background needs, inheritance anchor, existing-save activation and
the finite-population promise before implementing this proposal. A separate later
decision is required if indefinite renewal becomes a goal.
