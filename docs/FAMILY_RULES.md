# Implemented family and inheritance rules (v0.3.1)

These adjustable gameplay defaults resolve Phase 2B/3 implementation questions.
They are not statements about real genetics or moral worth.

## Relationships and births

Unrelated adults (18+) can court. Stable pair records are independent of the current
player. Attraction uses individual sex preferences, a seeded personal spark, public
reputation and social expectations. High trust cannot override lack of attraction.
Preferences are private until discussed; marriage never reveals genomes.

Citizen menus pause the world while choosing. An action resumes time, approaches
the target and waits out any existing cooldown before interaction. Movement,
Escape or Cancel stops the approach; queued actions are transient and not saved.

Courtship shares the three-second social cooldown and six-exchange daily budget.
There is a further cap of three romance actions per pair per day, diminishing gains
and no same-topic progress on repeated clicks. Proposals need affection 42+, trust
18+, active courtship and consent. One active marriage is allowed per person.
Separation and widowhood preserve the record and biological children. Same-sex
marriages receive identical household support: 12% less metabolism and playable
refuge healing of 2.1 health per second instead of 1.8.

Birth eligibility requires living opposite-sex spouses aged 18–60, affection 42+,
trust 18+, mutual willingness to raise children, playable health 35+ and food/water
30+. Some NPCs decline parenthood. Pair births have a two-family-year cooldown.
Cohort probabilities are 65% two children, 30% three, 5% four. Sex is independently
50/50, so both sexes are not guaranteed within a cohort. Birth is an immediate
abstract household event; there is no pregnancy queue. The current budget is 256
individuals, including deceased family records.

Every child has a distinct genome, stable ID, two biological parents, birth record,
generation and independent life/runtime state. Female line-form children retain
complete latent genomes and can be selected as heirs.

## Strict inheritance

The playable parent's genome is the lineage anchor. A female heir progresses her
own latent geometry, rather than replacing it with her husband's visible outline.
Both parents contribute physical traits and mutation tendency. Generation is one
greater than the highest biological parent's generation.

- Irregular triangles have a 65% improvement attempt, adding 0.10–0.21 regularity.
  At 0.72 they reach an isosceles configuration. Existing vertices become more
  symmetric; they retain three sides and cannot skip to equilateral in one birth.
- Isosceles triangles reduce sharpness by 0.10–0.18 on improvement. At 0.72 or below
  they become equilateral, without gaining a side in that birth.
- Already regular anchors retain regularity. During an improvement attempt they
  can gain one side with probability 0.28 plus inherited mutation tendency, or
  remain unchanged. The current side-count/rendering cap is 32.
- A maternal latent irregular-ancestry carrier has a 32% expression chance in an
  otherwise regular offspring. Either sex can inherit carrier status from either
  parent, with a 72% chance when a parent carries it. A visibly irregular child
  always retains carrier status. Some regular female founders carry undisclosed
  irregular ancestry; their public claims are unchanged.
- Reintroduced irregularity in four-or-more-sided polygons retains side count.
  Improvement attempts repair 0.10–0.20 regularity until regular. Side increases
  remain locked throughout repair, including the birth that completes repair.
- Size, mobility and metabolism blend both parents with independent variation.
  Rank never multiplies physical fitness. Female appearance never exposes latent
  geometry. Family observations can disclose pace and appetite without genetics.

The pure seeded implementation and constants are in [genetics](../src/genetics.js).

## Time, death and succession

One survival day (120 simulated seconds) equals one family year. This preserves
ordinary movement and consumption rates. Living individuals age continuously;
natural lifespan is deterministically 78–92 years per identity.

A supplied player at a refuge can advance one or five years. Each year processes
aging, natural deaths, widowhood, maturation and resource regeneration. Community
subsistence holds living characters' food/water at least 55 and restores stamina.
The pack, positions and AI paths remain; ordinary survival frames are not replayed.
The advance stops when the current player dies. There are no scheduled births.

Voluntary retirement opens at 40. A living adult biological descendant can inherit
control, including a daughter, son or later descendant. Retirement retains the old
player as an autonomous NPC. Upon death the same selection is offered and saved.
With no living adult descendant, the lineage ends. **Minor descendants cannot
inherit control and trigger neither guardianship nor automatic time skipping.**
The UI states this policy before death and preserves the final dynasty history.

World time, resources, terrain, siblings, household pack and expedition objectives
continue. The old observer's social notebook and reputation are archived; the new
player starts personal relationships, with recorded household names retained.
Marriage history and biological links never change merely because control changes.

## Persistence and limits

Original slot keys and generator version remain. Schema v4 persists private
characters, dynamic population, life state, family records, current observer,
archived notebooks and all three RNG streams. A candidate world is fully validated
before installation, including reciprocal family links and playable descent.
The private registry retains deceased identities outside living world simulation.
The explicitly enabled F8 testing inspector can display private simulation truth,
including hidden genomes. It is transient, pauses time and never updates observer
knowledge or save data; normal family/notebook/bubble disclosure rules remain.
Explicit generation ordering excludes ancestry cycles; v4 imports reject spouse
bonds that disagree with reciprocal marriage history. Observers, household support
and family DTOs have separate boundaries without changing these gameplay rules.
Legacy v1/v2/v3 first validate original seeded identity signatures, then acquire
family defaults. The legacy generation-zero founder becomes Generation 1.

Export/import is available from the menu/pause flow. Import validates before
confirmation and installation; browser slots remain until explicit saving or a
later autosave. The checksum detects accidental corruption, not deliberate editing.
The save budget is 2 MB. Developer hooks require the debug query parameter.

The founding population ages without autonomous NPC reproduction or immigration.
Unrelated fertile partners can eventually run out. The selected next direction is
[autonomous NPC families](POPULATION_RENEWAL_DESIGN.md), with proposed pacing and
activation still open for discussion. Reproduction in a closed population cannot
guarantee unrelated partners forever under the current kinship/budget rules.
Archival compaction and adoption remain unimplemented; see the
[Phase 3.5 handoff](PHASE35_HANDOFF.md).
