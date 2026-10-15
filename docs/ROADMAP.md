# The Flatland — Development Roadmap

**Design baseline:** v0.3 · 2026-10-15  
**Project:** Browser-based, two-dimensional survival, society, and generational evolution game inspired by Edwin A. Abbott's *Flatland*.  
**Status:** Phase 1.1, 2A, 2B and 3 are implemented in [the playable build](../the-flatland.html), v0.3.1. See [current QA](QA_REPORT.md), [implemented family rules](FAMILY_RULES.md) and [checkpoints](IMPLEMENTATION_STATUS.md). The usability follow-up adds anchored action bubbles, automatic approach, paused choices and concise tutorials. Later phases remain planned.

**Repository and license:** [PakingPie/Flatland-A-Web-Based-Game](https://github.com/PakingPie/Flatland-A-Web-Based-Game) is public and uses the [MIT license](../LICENSE), Copyright (c) 2026 PerkinPie. Public deployment is a separate decision.

> **North star:** Survive as a shape in a stratified two-dimensional society, learn who other citizens really are, form a family, and choose a descendant whose inherited geometry carries your lineage forward. Social prestige must not be treated as proof of genetic fitness, intelligence, or moral worth.

## Phase overview

| Phase | Status | Focus | Exit criterion |
| --- | --- | --- | --- |
| 1 — Living World | **Implemented; original [baseline preserved](../baseline/the-flatland-phase1.html)** | Canvas world, movement, resources, survival, wandering NPCs, minimap | Explore and complete a three-day survival expedition |
| **1.1 — Polish & Persistence** | **Implemented in [the-flatland.html](../the-flatland.html), v0.2.0; [QA evidence and limits](QA_REPORT.md)** | HUD/camera fixes, clearer rest feedback, saves | Resume the same game reliably, including NPC/resource state |
| **2A — Living Society** | **Implemented in [the-flatland.html](../the-flatland.html), v0.2.0; [QA evidence and limits](QA_REPORT.md)** | Citizen identities, conversation, trust, rumors and partial knowledge | Introduce yourself, discover limited information, and retain relationship progress |
| 2B — Courtship & Marriage | **Implemented, v0.3.1** | Preferences, attraction, courtship, consent, same-sex marriage and household support | Marriage persists through save/load |
| 3 — Family, Inheritance & Evolution | **Implemented, v0.3.1** | Multiple offspring, strict genetics, aging, genealogy and playable succession | Verified daughter control in Generation 2 and Generation 3 births |
| 3.5 — Architecture hardening | **Core boundaries implemented; renewal design pending** | Stable registry, storage-independent migrations, family/observer/household seams, incremental rows | Current gameplay and v1–v4 fixtures pass; discuss [NPC families](POPULATION_RENEWAL_DESIGN.md) before rules change; see [handoff](PHASE35_HANDOFF.md) |
| 4 — Combat & Law | Planned | Shape-specific attacks, danger, guards, injuries, crimes | Combat and legal reactions follow geometry and social context |
| 5 — Civilization | Planned | Trade, property, class mobility, politics, institutions and reform | Multiple viable long-term paths beyond becoming a circle |

**Milestone strategy:** Courtship/marriage was tested and committed before genetics; births/genetics and then aging/succession received separate commits. Native Chromium persistence passed before family implementation and after generational transitions. Finish architecture hardening and sustainable population design before combat.

## Phase 1 — Preserved baseline

The original self-contained HTML5 Canvas prototype is preserved in the [Phase 1 baseline](../baseline/the-flatland-phase1.html). Its survival systems are also included in the current v0.2.0 build. It includes:

- Seeded world generation, districts, roads, obstacles, buildings, and refuges.
- A player-controlled irregular triangle, movement, sprint, collision, and mobile touch movement.
- Food/water gathering, hunger, thirst, stamina, health, resting, and death/retry.
- Autonomous polygon citizens, navigation and basic hover inspection.
- A minimap, pause/help UI, and a three-day expedition objective.
- Optional deterministic QA hooks via `?debug=1`.

**Current files:** The repository includes the [playable build](../the-flatland.html), modular source under `../src/`, and the [build tool](../tools/build.py). Historical automated results are recorded in the [QA report](QA_REPORT.md); the original gameplay test harness and raw artifacts are absent (see [Known gaps](../README.md#known-gaps)).

## Phase 1.1 — Polish & Persistence

**Status:** Originally implemented in v0.2.0 and preserved in the current [v0.3.1 build](../the-flatland.html). Native Chromium saving, shutdown and reopen now pass in [current QA](QA_REPORT.md); other browser environments remain unverified.

**Scope**

1. **Camera/HUD at world boundaries:** The camera clamps at the edge and the bottom action bar may cover the player. Avoid occlusion at every edge without jitter or breaking hover picking and minimap coordinates; test desktop and touch layouts.
2. **Rest feedback:** Field rest already accelerates stamina recovery and reduces hunger/thirst consumption. It **does not restore health**. Refuge rest restores health only when sufficiently nourished and hydrated. Explain these differences in the UI.
3. **Versioned saves:** Implement manual save/load, continue, periodic autosave, and safe lifecycle saving using browser `localStorage`. Handle storage denial, quota errors, corruption and future schema migrations or incompatibility.
4. **State completeness:** Restore seed, elapsed simulation time, relevant RNG state, player vitals/inventory/position, mutable resources, NPC identities and mutable state, discovered knowledge, relationships and expedition progress. Regenerate immutable terrain from seed where appropriate; avoid duplicating entities.
5. Preserve existing survival gameplay, controls, and visual identity.

**Accept when:** A player can save, close/reopen and continue equivalently; the player remains visible at each world edge; rest effects are understandable; Phase 1 regression checks pass.

## Phase 2A — Living Society

**Status:** Implemented in [the-flatland.html](../the-flatland.html) (v0.2.0). See [QA evidence and limits](QA_REPORT.md). The scope below describes the milestone; independent rumor verification and investigation remain unimplemented, as recorded in the [README](../README.md).

**Scope**

- Persistent names, professions, visible forms, occupations, social standing, personalities, preferences, and basic family metadata for NPCs. Sex, visible form, and latent genome must remain distinct.
- Proximity-based interactions: introductions, casual conversation, occupation, interests, background questions, social commentary, and light gossip.
- Familiarity and trust changes based on behavior, personalities, social prejudice, and repetition limits; conversations may be declined.
- Reputation as a lightweight extension point for later marriage, trade, crimes and politics.
- Two-tier UI: brief observational hover and a richer interaction/knowledge panel, including mouse/keyboard/touch access.
- **Three separate information layers:** `actual` (authoritative private state), `publicIdentity` (visible claims/reputation), `playerKnowledge` (observations, reports, rumors, verified discoveries).
- Knowledge levels: **stranger → acquaintance → familiar → trusted → intimate**. These are access guidelines, not automatic disclosure; a trusted citizen can still keep secrets.
- Rumors can be mistaken; public claims can be false; some citizens may not know their ancestry themselves.
- All social/knowledge changes persist in saved games.

**Accept when:** Player meets an NPC, learns their name and some public facts, can improve or damage trust, cannot expose hidden ancestry by merely hovering, and can save/load discoveries. NPCs remain autonomous and survival still works.

**Explicitly out of scope:** Marriage, children, genetic progression, combat, criminal justice, complex economy and government.

## Phase 2B — Courtship & Marriage

**Status:** Implemented in v0.3.1. Deterministic and real-browser evidence is recorded in [QA](QA_REPORT.md).

- Romantic compatibility, preferences, affection, agency, consent, rejection, and marriage/partnership status.
- Marriage eligibility is **separate** from biological reproduction eligibility.
- Same-sex marriages are allowed and have meaningful shared-life/household and social effects.
- Under the agreed initial game rules, same-sex marriages **do not produce joint biological children**. A character with an existing biological child may still select that descendant in a later generation. Without any eligible descendant, the playable lineage ends upon death.
- Cultural rules and social prejudice may influence NPC attitudes, but a society's discriminatory hierarchy must not be confused with a moral judgment by the game itself.
- Family history becomes a meaningful, partly hidden consideration during courtship.

**OPEN DESIGN QUESTION:** Adoption or household-heir rules remain unresolved and unimplemented. Under the current rules, an existing biological descendant remains eligible after same-sex remarriage; without a living adult descendant, death ends the playable lineage.

**Accept when:** Different NPCs can accept/reject proposals for believable reasons and the relationship/marriage state survives save/load; birth is reserved for Phase 3.

## Phase 3 — Family, Inheritance & Evolution

**Status:** Implemented in v0.3.1, including playable daughters, genealogy, aging and save migration. The founding population is finite: no autonomous NPC births or immigration yet.

### Multiple offspring and succession

- A female line-form character may bear **multiple children in one birth event**. The cohort size and probabilities are balance parameters, not fixed design numbers yet.
- Each child gets a persistent identity, distinct genome, birth event, two biological parent links, family relationships, and independent life state.
- Children may include polygon-form sons and line-form daughters; females retain the visual thin-line form but carry latent geometric heredity.
- The player may choose **one eligible offspring** to control next. Unchosen siblings continue living as independent NPCs and remain in the family tree.
- A lineage can end if there is no eligible successor. Existing children remain eligible regardless of a later same-sex marriage.

### Strict geometric progression

```text
Irregular triangle
      ↓ less irregular / less sharp
Isosceles triangle
      ↓ progressively less sharp
Equilateral (regular) triangle
      ↓ possible +1 side
Square → Pentagon → Hexagon → ... → higher regular polygon
```

1. **No extra sides** until a triangle has become equilateral/regular.
2. Pre-regular mutations progress toward a less sharp, more symmetrical triangle, reaching an isosceles form before an equilateral form.
3. Reaching a regular triangle unlocks a **chance**, not a guarantee, of gaining one additional side in future offspring.
4. Once a lineage has reached a regular polygon, ordinary offspring remain regular, even when side counts do not increase.
5. **Exception:** A female partner carrying **irregular ancestry** can probabilistically reintroduce irregular geometry despite a regular lineage anchor. Close biological relatives cannot court.
6. Female line-form citizens' true heredity is not visible from their line appearance; ancestry is discovered socially, not by hovering.
7. Geometry/fitness and society's class rank are different systems. Mutations and partner choices may carry trade-offs, not universal upgrades.

**Resolved implementation defaults:** Reintroduced irregular polygons retain sides until regularity is repaired. Births have 2–4 offspring and a two-year cooldown. Adulthood is 18, retirement 40, reproduction 18–60 and natural lifespan 78–92. One survival day ages characters one year; refuge advancement covers subsistence. Only living adult descendants inherit, with no guardianship for minors. See [full rules](FAMILY_RULES.md).

**Accept when:** Two suitable parents can produce multiple individually simulated children, rules are enforced in deterministic tests, and the player successfully continues as a chosen successor with persistent genealogy.

## Phase 4 — Combat & Law

- Shape-driven attacks/defense: narrow triangle tips have piercing reach but other costs; blunt/regular bodies play differently.
- Soldiers, threats, retreat, injuries, recovery and optional permadeath risk.
- Witnessing, crime, guards, penalties and class-biased enforcement.
- Persist injuries, hostility, and legal standing. Test that combat cannot corrupt succession or save data.

**Accept when:** Encounters have clear geometry-based consequences and meaningful social/legal aftermath.

## Phase 5 — Civilization

- Goods, exchange, households, property and inheritance of possessions.
- Institutions, social privilege, class advancement, family reputation and propaganda/rumors.
- Long-term goals: aristocratic dynasty, survival-focused lineage, unconventional evolution, or social reform.
- Keep these goals open-ended rather than enforcing "become a circle" as the only ending.

## Design invariants for every phase

1. **The world is 2D:** Visible polygons/lines are the aesthetic and core mechanical language.
2. **A woman's line form does not reveal her hereditary geometry or ancestry:** Female characters appear as thin lines while carrying hidden inheritable geometry.
3. **Hierarchy is socially constructed:** Do not mechanically equate elite geometric status with moral worth or genetic superiority.
4. **Truth is not knowledge:** Separate actual data, public claims, and player discoveries; never leak ancestry through a tooltip or data view.
5. **Generations matter:** Player decisions affect relationships, inherited forms, genealogy, and legacy.
6. **Mutation is staged:** Preserve the strict progression and irregular-ancestry exception above.
7. **Static-site friendly:** Prefer HTML5 Canvas and lightweight JavaScript; no backend requirement for initial play, and allow a deployable static build.
8. **Test before expanding:** Maintain fixed-seed tests, save/load regressions, keyboard/touch interactions, and manual browser playtesting.
9. **No premature scope explosion:** Finish and test each milestone before adding full adjacent systems.

## Working agreements

- Treat this document as the v0.3 design baseline. Update it explicitly when mechanics change.
- Record completed features with evidence from implementation/tests, not assumptions.
- Preserve the original Phase 1 baseline in version control before larger refactors.
- Keep gameplay code, game design, and progress tracking separately documented.
- Do not enable public deployment solely because the repository is public.
