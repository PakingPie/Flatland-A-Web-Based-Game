# Implemented family and inheritance rules (v0.3.4)

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
30+. Hesitant spouses can reconsider as the relationship grows. Pair births have a two-family-day cooldown.
Cohort probabilities are 65% two children, 30% three, 5% four. Sex is independently
50/50, so both sexes are not guaranteed within a cohort. Birth is an immediate
abstract household event; there is no pregnancy queue. The current budget is 256
individuals, including deceased family records.

### Relationship-dependent willingness

The user selected allowing hesitant spouses to reconsider. The seeded family-life
preference remains the baseline; current willingness adds relationship support:

- Trust contributes 0 below 30, increasing linearly to +0.08 at 70.
- Affection contributes 0 below 50, increasing linearly to +0.08 at 90.
- Current willingness is baseline plus those contributions, capped at 1. Birth
  needs willingness 0.30+, as well as the existing trust 18+ and affection 42+.

Every existing baseline can cross the threshold with a strong enough bond. Support
is recomputed from the current relationship; it can fall if trust or affection
falls. It is not a permanent permission flag. Health, supplies, marriage, biological
eligibility and birth cooldown remain separate requirements. Rank and hidden
ancestry do not affect willingness.

**Discuss children** is an optional informational action under Romance/Affection →
Commitment. It explains trust, closeness or hesitation and acknowledges same-sex
biological limits. It shares the social cooldown and romance daily budget, but
awards no trust/affection/willingness and writes no new topic counter. Varied
relationship actions grow the bond; repeated requests cannot farm willingness.

The Family screen now distinguishes trust, affection and hesitation instead of
one generic refusal. F8 shows baseline, current willingness and each contribution.
Readiness is derived from existing saved fields, so legacy saves need no restart,
schema migration or new stored preference. NPC population renewal is unchanged.

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

One day lasts 120 simulated seconds and adds one day of age. This preserves
ordinary movement and consumption rates. Living individuals age continuously;
natural lifespan is deterministically 78–92 days per identity.

A supplied player at a refuge can advance one or five days. Each day processes
aging, natural deaths, widowhood, maturation and resource regeneration. Community
subsistence holds living characters' food/water at least 55 and restores stamina.
The pack, positions and AI paths remain; ordinary survival frames are not replayed.
The shared clock splits at day boundaries and natural deaths. NPC family events
run after deaths/widowhood, with no aging before a child's birth. Both ordinary
time and refuge days use the same scheduler; the advance stops when the current
player dies, before new family events at that boundary.

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

Original slot keys and generator version remain. Schema v5 persists private
characters, dynamic population, life state, family records, current observer,
archived notebooks, the original three RNG streams and two separate renewal streams.
A candidate world is fully validated
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
V5's save budget is 2 MB of UTF-8, plus the existing tree/array/event limits. Legacy
readers retain their original string-unit acceptance; no load rewrites a slot.
Old builds reject v5 exports, so keep a pre-upgrade backup. Developer hooks require
the debug query parameter.

## Autonomous NPC families

The user adopted [bundle A–E](POPULATION_RENEWAL_DESIGN.md#adopted-decision-bundle--2026-10-16).
New expeditions enable renewal. Existing saves retain founding-only behavior
until **Pause → Population & families → Enable NPC families**. Activation and
re-enabling begin at the next family day without historical catch-up. Disabling
keeps existing people, marriages and history.

Each day permits at most one new private courting pair, one new NPC marriage and
one NPC cohort globally. Adults must be unrelated and mutually compatible, using
each counterpart's public reputation rather than the observer's. Private directed
trust/affection start at zero and gain 10/12 per eligible daily evaluation. Each
side needs trust 18+ and affection 42+ to commit: four successful evaluations.
Newly formed marriages cannot give birth in that day. Same-sex marriages retain
the same household support and no joint biological births.

Each NPC parent must independently meet the current willingness formula; both
must be alive, aged 18–60 and at health 35+. Background community subsistence
abstracts food/water eligibility without refilling ordinary NPC meters or helping
the playable character. Cohorts retain the 2–4 distribution and two-day cooldown.
Two autonomous cohorts are permitted per marriage, counting player cohorts too;
player commands keep their existing rules. Require room for four NPC children
under 96 living / 248 total records. The global 256-record cap is unchanged; deaths
free only living capacity. Complete candidate-save validation precedes every
cohort, so refusal consumes no live IDs, birth RNG, cooldown, links or discoveries.

Household anchors persist: the sole founder-lineage spouse anchors that household;
other families use a seeded choice between parents. Control transfer does not
switch the anchor. A married NPC heir retains the marriage, cooldown and cohort
count and begins with their experienced household relationship, without another
observer's private claims. Ordinary existing successions keep their notebook rules.

The current player is excluded from automation; retired founders and unchosen
siblings can participate. NPC marriage can close unfinished player courtship, with
a brief commitment response that names no undiscovered partner. Existing marriages
cannot be stolen. Background events do not automatically teach names, ancestry or
traits. Consenting family conversation can share household names as sourced claims.
An otherwise unknown adult heir is offered anonymously when succession opens.

Full deceased records, final runtime, genealogy, event sources and observer
notebooks remain in the export. No compaction, immigration, adoption, ID reuse or
kinship relaxation occurs. A closed population can still lose all eligible partners
or become extinct. See [current evidence and limits](QA_REPORT.md) and the
[handoff](PHASE35_HANDOFF.md).


## Presentation: days and known family

The day vocabulary replaces the former family-year vocabulary without changing
any durations, age thresholds, RNG streams or saved numeric values. Family ages
are explicitly in days; calendar birth/marriage/death history is one-based like
the HUD. Legacy field/API names such as `ageYears`, `lastBirthYear`, `processedYear`
and the optional debug `advanceYears` remain compatible implementation names.

Gold dashed halos and gold minimap dots identify living members of the observer's
known family, including spouses. The current player is excluded and retains the
coral marker. Deceased records are never drawn; undiscovered biological relatives
receive no marker. Selected-citizen rings stay green. These derived visual marks
are never saved and cannot teach facts or advance RNG.


## Known parent/child/sibling bonds

Known parent–child relationships receive +48 familiarity / +20 trust support;
known siblings receive +36 / +12. Add support to saved personal scores, capped at
100 and the usual lower limits. This is computed on read, never repeatedly awarded
or saved as a new flag. Personal trust can still fall enough to become negative;
a role is not permanent friendliness or consent. Spouses keep their established
romance/readiness rules, without this biological-family bonus.

Roles derive exclusively from the observer's known birth events. Hidden biological
parents or siblings receive neither a label nor support. Parent/child/sibling names
appear in bubbles and family rows, alongside existing adulthood countdowns. Known
direct relatives have no romance choices. Social stages and ordinary social checks
use the effective scores. F8 shows both the support and effective relationship,
while retaining the raw saved record. No discovery is taught by reading a bond.
Succession restores personal notebooks as before, then derives the new observer's
own known family roles; it does not copy a parent's private claims. Existing v1–v5
save readers, frozen payloads and RNG streams are unchanged.
