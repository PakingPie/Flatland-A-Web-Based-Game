# Phase 3.5 architecture handoff

The playable family loop is implemented and tested. Keep this hardening phase
separate from combat, law, large economies or political systems.

1. Introduce a character registry keyed by stable ID, separating living world
   actors from deceased genealogy records. Current world arrays preserve every
   record; avoid changing IDs or removing a referenced ancestor during a refactor.
2. Extract candidate validation and explicit schema migrations from storage I/O.
   Preserve v1/v2/v3 fixtures, v4 round trips, original slot keys and transactional
   installation. Add a frozen released-v4 fixture before changing its format.
3. Separate family commands/events, biological inheritance, observer notebooks,
   household state and DTO presentation. Keep pure seeded inheritance independent
   of rendering. Add explicit invariants for spouse reciprocity and generation DAGs.
4. Define sustainable population renewal. Current unrelated citizens are a finite
   aging founding cohort; no autonomous reproduction or immigration is simulated.
   Decide on a small replenishment rule before promising unlimited generations.
5. Bound and compact archived notebooks, death records and long family histories.
   Preserve the known/unknown ancestry distinction and retain export recovery.
   Current limits are 256 total characters and a 2 MB envelope.
6. Playtest the natural, unassisted courtship/survival balance. Automated browser
   tests locate compatible citizens and control proximity, needs and time. Verify
   discovery, travel and partner availability without those controls.
7. Expand browser coverage to Firefox/Safari, physical mobile rotation, storage
   denial/quota, keyboard/assistive technology and repeated long-session resumes.
   Current evidence is Chromium on Windows, including emulated touch.
8. Give family screens efficient incremental rendering and a more compact linked
   tree when population size justifies it. Keep hidden female genomes out of DTOs.

## Suggested starter prompt

> Work on The Flatland Phase 3.5 architecture hardening. Read README, ROADMAP,
> FAMILY_RULES, QA_REPORT and IMPLEMENTATION_STATUS in this repository. Inspect the
> current branch, uncommitted work and latest commits first. Preserve the playable
> Phase 2B/3 loop, stable character IDs, private ancestry, legacy save fixtures and
> standalone build. Begin with a character/record registry and migration boundaries;
> make recoverable commits and rerun the included deterministic/browser suites.
> Do not implement combat, law or broad society simulation. Treat sustainable
> population renewal as a documented design decision before changing the rules.
