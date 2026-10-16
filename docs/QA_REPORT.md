# QA report — Phase 3.5 renewal (v0.3.5 / save v5)

## Merged Phase 4A baseline — 2026-10-16

The first Phase 4A checkpoint adds six pure melee cases: **88/88 rule tests**,
all ten existing Chromium suites, build agreement and documentation checks pass.
Profiles, contact, fixed-step single-hit/recovery timing, defense/nonlethal damage
and hidden-genome independence are covered. Gameplay is not connected at this
checkpoint. The original 82 cases remain included, not replaced.

Clean `main` at `b8caef8` passes build agreement, all documentation references,
**82/82 rule tests and all ten browser suites**. Native save/restart, generations,
bubbles, survival/touch regressions, architecture, F8, parenthood, renewal,
family presentation and growth all pass. The installed Chromium was selected
explicitly; the sandbox blocked its launch, so isolated test-owned profiles and
localhost servers ran outside the sandbox. Normal player saves were not opened.

The user explicitly deferred the human balance playtest for bounded Phase 4A.
This supersedes older “unwaived” gate statements in this historical report.
Unassisted survival, travel, partner discovery, courtship and competing NPC
commitments remain unverified. Controlled browser checks do not satisfy them.

## Approved visual growth stages — 2026-10-16

V0.3.5 implements the user-approved child/teen/adult/elder stages: 0–5 days at
45% adult outline, 6–17 at 70%, 18–64 at 100%, and 65+ at 85%. Stages are derived
from age without daily resizing, stored flags or migration. Visible polygon/line
vertices scale; stroke widths stay readable. Family halos/name offsets and public
size observations follow the visible body; family rows and F8 identify the stage.
Physical radius/points, navigation, movement, picking, genomes, side counts,
female privacy, family bonds, mortality, succession and RNG remain unchanged.

Baseline at `89a0246` was clean and passed build/docs and 80 deterministic cases
before implementation. Current validation passes **82 deterministic cases, all ten
Chromium scripts, build agreement and documentation checks**. The new
[growth browser suite](../tools/browser-growth.cjs) measures actual Canvas polygon
and line outlines at all four ratios, verifies readable 1.6px strokes and exact
read-only payloads, advances through days 6/18/65 with the real Family day buttons,
and reloads a native save with identical state and visual stages. Controlled ages
and positions are synthetic test setup, not human play evidence. Desktop,
portrait and landscape screenshots were inspected. Raw artifacts remain ignored
and local; normal player profiles were untouched. Existing frozen saves stay exact.

Growth changes are intentionally visual: small children retain adult movement,
collision and selection clearance. No combat, law, guards or civilization is added.
The human balance playtest gate before combat is still uncompleted and unwaived.
Earlier proposed stages below are historical and superseded by this adoption.


## Known family bonds — 2026-10-16

V0.3.4 implements the approved initial parent/child/sibling bond and role labels.
Effective familiarity/trust adds 48/20 for known parents/children and 36/12 for
known siblings to their personal scores. Trust can still deteriorate; this is not
a permanent floor or an automatic disclosure. Existing raw save fields stay exact,
so existing families and newly selected heirs benefit without migration. Spousal
readiness remains unchanged. Known direct relatives have no romance choices.
Family rows retain both roles and the adulthood countdown. F8 remains read-only
and explains raw versus supported relationship values.

All 80 deterministic cases and nine browser suites pass. New cases cover pure
bond reads, deterioration, parent/sibling roles after succession, hidden birth
provenance and exact save recovery. The real-browser family presentation scenario
opens a daughter's mother, checks Familiar / trust 20 / familiarity 48 and verifies
that romance choices are absent. Normal profiles are untouched; evidence remains
local under ignored output.

Growth/elder shrinkage is a separate proposal, not implemented or adopted here:
0–5 days at 45% adult outline, 6–17 at 70%, 18–64 at 100%, 65+ at 85%. Recommend
visual scaling first, preserving inherited geometry, female privacy and existing
collision/movement. Wait for user feedback before treating those thresholds and
scales as selected rules. The human playtest gate before combat is unchanged.


## Family highlights and day vocabulary — 2026-10-16

V0.3.3 adds gold dashed halos and gold minimap dots for the current observer's
known living family, including spouses. Deceased records, the player, strangers
and undiscovered biological relations receive no family marker. Marking is derived
from the same privacy-safe family membership used by the register and is never
persisted. Selected-citizen rings remain green and the player remains coral.

One day remains 120 simulated seconds, with one unit of age per day. Ages,
refuge advancement, cooldowns, history and Help now consistently say days;
calendar event labels start at Day 1 like the HUD. Numeric rules, save v5, legacy
field names, IDs, RNG and raw event timestamps remain unchanged.

All 78 deterministic cases and nine Chromium scripts pass. The new
[family presentation suite](../tools/browser-family-presentation.cjs) observes
actual Canvas gold strokes/dots, post-succession membership, hidden-cohort
provenance, read-only payloads and the actual 1-day button's 120-second age step.
Desktop/portrait/landscape captures were inspected. Raw evidence stays local in
ignored output; no normal player profile was used. Earlier reports below retain
the old year terminology and suite counts as historical evidence.


Executed 2026-10-16 on Windows with Node 24.12.0, Python 3.14.2 and real Chromium
149.0.7827.55 using the bundled Playwright runtime. The
[historical Phase 1.1/2A report](QA_PHASE2A_HISTORICAL.md) remains separately
preserved; its old counts are **not** added to current results.

## Renewal implementation results — 2026-10-16

Current validation: **78 deterministic cases**, all **eight Chromium scripts**,
build agreement and documentation links pass. The earlier 63/65/69-case results
below describe prior checkpoints and are not added to this total.

- New renewal cases cover mutual refusal and same-sex support, four-evaluation
  commitment, independent parenthood willingness, two-cohort limits, competing
  player courtship and protected existing marriage, separate RNGs, privacy,
  activation/off/re-enable, duplicate-year suppression, fractional deaths,
  same-boundary survival death, married daughter control, anonymous adult heirs,
  capacity reserve and atomic oversized-notebook refusal.
- Ordinary-time family outcomes, refuge batches, single years and repeated reloads
  agree with controlled boundary inputs. Whole-world ordinary/refuge payloads are
  intentionally not equated because movement/needs differ. Equivalent execution
  paths and native browser restarts still compare complete payloads.
- Both frozen v4 checkpoints retain every original payload field, including full
  deceased runtime, birth/death records and notebooks; v5 adds renewal state.
  Legacy policy remains disabled. Anchor/count/cursor/RNG corruption rejects the
  candidate; v5 uses UTF-8 bytes while legacy string-unit parsing is retained.
- The new [renewal browser suite](../tools/browser-renewal.cjs) passes six groups:
  explicit legacy opt-in and untouched manual slot; normal-clock/year-button NPC
  births; read-only F8; native v5 shutdown/reopen; off/re-enable without catch-up;
  desktop/portrait/short-landscape and emulated touch controls. No page exceptions.
  Policy screenshots were inspected. The seven prior scripts also pass. The older
  generational scenario explicitly disables renewal to preserve its finite-world
  baseline; renewal-enabled behavior has its own scenario and headless fixtures.

### Population census and measured cost

[The population study](../tools/population-study.cjs) ran 20 fixed seeds for 100
family years each (2,000 samples), including exact export/reload checks every ten
years. It is a demographic fixture: no player courtship/births or survival-needs
simulation, and the census continues after founder extinction without reviving or
replacing anyone. It does not establish natural discovery, human balance or an
indefinitely viable playable lineage. The final-source rerun used four independent batches of five fixed seeds; every
seed has 100 recorded samples, with the full twenty-seed report aggregated locally.

| Measure | Observed |
|---|---|
| First NPC cohort | Years 6–17 across seeds |
| Living population at year 100 | 0–66; seeds 2 and 6 had no survivors |
| Peak living / total records | 87 / 139 |
| Largest compact envelope / tree | 373,393 UTF-8 bytes / 20,189 nodes |
| Deferred evaluations in this census | 0; no capacity pressure was reached |
| Year callback time under concurrent QA load | Median 158.8 ms; p95 375.9 ms; maximum 590.1 ms |

Each sample records births/children/deaths, courting/married households, eligible
unrelated adults by sex and preferences, eligible pairs, extinction, size/tree
nodes and scheduler time. Separate synthetic capacity and large-notebook scenarios
exercise limits that this census did not reach. Timings include complete candidate
validation; they are not frame-rate, device or long-human-session guarantees.
Year boundaries can briefly pause; optimization remains a follow-up within the
same caps. The finite/extinction promise is retained without tuning away failures.

Run the population study from the repository root using the
[README validation commands](../README.md#source-and-validation). Raw JSON, screenshots, exports,
profiles and logs stay under ignored local output. No normal browser saves were
loaded. Node 24.12.0, Python 3.14.2 and Chromium 149.0.7827.55 were used; browser
processes ran outside the sandbox with isolated test-owned profiles/local servers.

**Remaining gate:** the unassisted human survival/travel/courtship/competing-
commitment playthrough is uncompleted and unwaived. A user report or explicit
deferral is required before combat. Firefox/Safari, physical mobile, assistive
technology, abrupt termination and long human sessions remain unverified. No
combat, law, guards, civilization, archive compaction or increased budgets ship
in this milestone.

## Baseline refreshed before Phase 4 planning — 2026-10-16

Reran the unchanged gameplay checkpoint `a54a872` before implementation. Build
agreement, documentation references and **63/63** deterministic cases pass. All
seven existing Chromium scripts pass again: native smoke, generations (8 groups),
bubbles (5), preservation (9), architecture (7), inspector (6) and parenthood (4).
Six suite result JSON files report no page exceptions; native smoke also asserts
no page errors. Node 24.12.0, Python 3.14.2 and Chromium 149.0.7827.55 were used.

The first sandboxed browser launch failed with Windows access denial
(`3221225506`); the same isolated smoke test and remaining suites passed outside
the sandbox. Existing scripts use test-owned profiles/contexts and ephemeral
localhost servers; no normal player slots or profiles were used. Evidence remains
under ignored output. Mobile family and desktop inspector captures were inspected.
This refresh does not add natural human play, other browsers or physical-device
coverage, and validates no proposed population or combat mechanics.

A static size audit of the frozen released-v4 fixture finds 67 total records,
63 living and four deceased. The compact envelope is 157,048 UTF-8 bytes / 157,031
string units and 8,430 JSON tree nodes; full deceased records occupy 8,776 bytes
as an array and archived notebooks 849 bytes. These measurements describe one
small fixture, not capacity/performance headroom for arbitrary dynasties. Current
`maxBytes` parsing is a string-length check; proposed v5 byte accounting and
large-notebook preflight remain implementation work.

The design-only [renewal bundle](POPULATION_RENEWAL_DESIGN.md) and
[Phase 4A plan](PHASE4A_PLAN.md) distinguish recommendations from adopted rules.
No implementation or save-format change accompanies this planning checkpoint.

## Architecture-only checkpoint results — historical

| Suite | Result | Scope |
|---|---|---|
| Dependency-free deterministic suite | 63 passed, 0 failed | Rules, registry/observer integration, v1–v4 migration, willingness, malformed-save rejection, population-budget stress |
| Native browser smoke | Passed | Manual save, full Chromium shutdown, reopen, Continue, identical payload |
| Browser generation scenario | 8 check groups passed | UI courtship through daughters, further births, storage and death cases |
| Action-bubble usability | 5 check groups passed | Paused choices, real approach, cancellation, responsive notebook and native emulated touch |
| Browser preservation regressions | 9 check groups passed | Survival, native v2 migration, touch, Canvas and standalone opening |
| Browser architecture checks | 7 check groups passed | Released-v4 native recovery, keyed family rows, storage failure injection, cross-tab protection |
| Reversible testing inspector | 6 check groups passed | F8/console/touch, private truth, read-only payloads, normal privacy restoration and reload |
| Parenthood reconsideration | 4 check groups passed | Existing hesitant marriage, informational conversation, actual relationship gains/birth, native save/reload |
| Build agreement / documentation links | Passed | Generated HTML matches source; local document references resolve |

Browser check groups contain multiple assertions; they are not represented as an
inflated count of individual gameplay cases. The twelve world-corner checks are
included within the preservation suite. Test scripts and fixtures are committed;
raw test JSON, screenshots, exported test saves and isolated profiles remain local
in the ignored output directory.

## Reproduction

Run the commands in the [README validation section](../README.md#source-and-validation)
from the repository root. The committed scripts are [rules](../tools/test.cjs),
[browser smoke](../tools/browser-smoke.cjs), [generations](../tools/browser-generations.cjs)
, [action bubbles](../tools/browser-bubbles.cjs)
and [survival/touch regressions](../tools/browser-regressions.cjs).

The browser scripts require Playwright and an installed Chromium. Set
`FLATLAND_NODE_MODULES` and/or `FLATLAND_CHROMIUM` when using a bundled package
directory or explicit browser executable. The scripts start ephemeral local static
servers and isolated browser contexts/profiles; no normal player saves are loaded.
Initial sandbox launch/socket restrictions were resolved by running the isolated
browser checks outside the sandbox with authorization. No storage adapter was used
for browser persistence. The pure rule suite uses an explicit in-memory storage
stub only for slot fallback and transactional-error tests.

## Rule and integration coverage

- Seed reproducibility, actor/geometry validity across twelve seeds and complete
  current snapshots; deterministic inheritance without a renderer.
- Attraction independent of excellent trust; rejected courtship/proposals;
  acceptance after varied courtship; shared social cooldown, repetition penalties,
  diminished gains and daily limits.
- Same-sex marriage, equal household support, marriage history, separation,
  widowhood, retained children after remarriage, and no joint same-sex births.
- Multiple individually persistent children with distinct genomes and stable
  biological parents; female latent genomes and privacy-safe DTOs.
- Irregular → isosceles → equilateral staging without skipped stages or premature
  side increases; unchanged offspring; regular progression by at most one side;
  maternal carrier expression and side-locked irregular polygon repair.
- Refuge years, adulthood, old-age death, retirement gates, male/female heirs,
  independent siblings, archived observers, later-generation parentage, and the
  explicit death-with-minors extinction policy.
- RNG continuation, current family round trips, malformed age/identity/genome,
  ancestry/child reciprocity, generation, birth, AI, inventory and knowledge records;
  checksum/version/JSON failures and fallback to an older valid slot.

## Migration evidence

A frozen released-v4 fixture executes `87feb3c` source, including daughter
succession, an archived founder notebook, births and deaths. Its complete payload
round-trips exactly after the registry and save refactors. Stateless codec tests
also decode v2/v3/v4 with no DOM, storage adapter or active game, preserving source
envelopes. V4 observer-ID fallback remains compatible. Original slot keys and
schema/generator versions are unchanged.

The v2 fixture was generated by executing stable `6e565b7` source, with controlled
inventory, depleted resource, trust, knowledge and reputation state. The v3 fixture
was generated by executing marriage checkpoint `0d34434` source with a same-sex
marriage. Both migrate using the legacy generator signature; marriage and social
state survive. The v1 test is explicitly a **synthetic legacy-schema fixture**,
because no original v1 save was recoverable.

The browser preservation suite additionally installs the original v2 fixture in
**native localStorage**, reopens the page and uses Continue. Inventory, resources
and trust match. The original slot remains v2 until explicit Save, which writes v4.
Failed loads/imports are validated against a separate candidate and preserve active
progress and browser slots. The generated HTML and source remain deterministic.

## Real browser gameplay evidence

The generation script uses actual UI buttons for introduction, conversation,
courtship, proposal, birth, family years and heir selection:

1. Start as an irregular founder, meet a compatible female citizen, grow trust and
   affection, marry and produce at least two distinct children.
2. Open the family register, inspect observations and privacy, advance twenty family
   years and select an adult daughter after retirement opens.
3. Continue as Generation 2 in the existing seed/world with independent siblings
   and the retired founder. Save, fully close Chromium, reopen the same isolated
   profile and Continue with an identical saved payload.
4. Move and survive as the daughter; court a male, marry and bear Generation 3
   children with correct biological links. Save, close/reopen and compare again.
5. Export a native JSON download, reject malformed input transactionally, and import
   the valid file while verifying browser slots remain untouched.
6. Form a same-sex marriage through UI, verify its household and biological rules,
   die without descendants and inspect the final dynasty summary.
7. Restore the pre-retirement family scenario, die with adult heirs, save while
   selection is pending, fully close/reopen, restore that choice and select an heir.

**Controls used:** opt-in QA hooks locate a willing unrelated candidate, teleport
to safe speaking/refuge positions, maintain needs and control the fixed clock.
All relationship gains, refusals, birth/genetic logic and control transfer run
through the real implementation. These are controlled integration scenarios,
not a claim that an unassisted human travel/courtship playthrough was completed.

The preservation script exercises native keyboard movement/sprint, collision,
resource gathering, eating/drinking, field versus refuge rest, NPC movement,
pause/resume and actor validity. It checks HUD clearance at all four world corners
at 1440×900, 390×844 and 844×390. A touch-enabled DPR-2 context uses actual emulated
touch events for the joystick and taps Pause → Family in portrait and landscape.
Production debug exclusion and opening the standalone HTML as a local file pass.

Desktop and phone family screenshots were visually inspected. The narrower touch
HUD intentionally hides the detailed identity block; Family remains accessible
through Pause. No page exceptions remained in executed browser scenarios.

## Limits and remaining work

- No physical-phone, Firefox, Safari, assistive technology or long unassisted human
  session testing. Native durability was observed in Chromium under normal close;
  abrupt process-kill, power-loss and simultaneous-tab atomicity are unverified.
- File-origin opening passed, but file-origin save shutdown/reopen was not tested.
  Use a stable served origin and exported files for important progress.
- Autonomous NPC families are implemented in the renewal checkpoint above. No
  immigration or adoption; closed-population extinction remains possible.
- Immediate abstract births have no scheduled pregnancy events. No hidden-genome
  investigation system is added; marriage cannot reveal carrier status.
- The compact family register is functional but has no graphical layout. Current
  budgets are 256 total individuals and a 2 MB envelope, with visible refusal at
  limits. Large/very long dynasties have not been performance tested.
- Browser quota/denial and multi-tab handling retain the existing error paths;
  the architecture suite now injects quota/denial and exercises native storage
  events, without claiming actual disk exhaustion or atomic multi-tab locking.

See [Phase 3.5 recommendations](PHASE35_HANDOFF.md) and
[implemented balance rules](FAMILY_RULES.md).

## Action-bubble follow-up

The interaction sidebar has been replaced by an anchored menu of up to four
choices. Selecting a citizen freezes simulation, including needs, NPC motion and
aging. Choosing an action resumes ordinary time, navigates to that citizen and
honors the existing shared social cooldown before applying the action. Movement,
Escape, pause and Cancel interrupt the transient queue; it is not restored from a
save. Lost targets, blocked routes and a 40-second catch-up limit cancel safely.

New unit cases cover cooldown-preserving approach, missing/deceased targets,
manual cancellation, short reply presentation and collision-free navigation around
a building. The bubble browser suite verifies paused time/vitals/NPCs, genuine
walking before a greeting, optional notebook privacy, cancellation, viewport fit
at 1280×800, 390×844 and 844×390, and native emulated touch selection. Menu and
reply screenshots were inspected locally. The full generation and native-storage
suites also run with the new nested choices and Family birth action.

The opening screen now uses one premise line; contextual prompts and optional Help
carry the controls. Family rows show summary information, with traits, relationships
and histories collapsed by default. No gameplay/save schema migration was required.

## Phase 3.5 architecture follow-up

Baseline verification ran first at `87feb3c`: 48 original deterministic cases and
all four original browser scripts passed. A frozen released-v4 payload was then
committed before refactoring. Final deterministic coverage is 60 passing cases,
including explicit spouse reciprocity/ancestry-cycle rejection, observer isolation,
duplicate IDs, atomic registry replacement and total-population budget stress.
The stress scenario reaches the existing record limit, kills non-household actors
and verifies that deceased records still count and refused births preserve IDs/RNG.
It is a capacity scenario, not a naturally played dynasty or performance benchmark.

The fifth browser script, [architecture checks](../tools/browser-architecture.cjs),
passes seven groups. It loads the frozen v4 file through native Continue three
times across two full Chromium restarts and compares complete payloads. It checks
deceased records outside living NPCs, failed malformed-bond imports, and family
year advancement retaining the same row nodes and expanded details. Injected
browser Storage quota/write denial, denied reads, startup storage denial and a
native cross-tab event preserve existing slots or permit play as appropriate.
These are injected API failures, not physical quota saturation or atomic locking.

The family-screen capture was visually inspected locally; the existing concise
layout and expandable relationships remain. All original browser suites pass with
the keyed renderer. No executed scenario produced page exceptions. Architecture
work does not enable population renewal, trim history, or broaden the verified
browser/device matrix. See [the NPC-family proposal](POPULATION_RENEWAL_DESIGN.md).

## Reversible all-information inspector

The explicit testing view is available with F8 or Pause → Testing → All information
in the production build; the broader debug API still requires its opt-in query.
The six-group inspector browser suite verifies repeat-safe F8, Escape, repeated
console toggles, selected-citizen entry, searchable living/deceased records,
hidden female geometry/carrier state, archived notebooks and a world snapshot.

Complete payloads (including knowledge and all RNG streams) and native slots are
identical before/after inspection. Gameplay hotkeys and controlled time advance
cannot mutate the world while inspecting. Closing clears private record text and
options; reloading restores normal mode, even if the page closed while inspecting.
Normal family DTOs remain privacy-safe. Native emulated touch entry/exit passes
without the debug API. Desktop, portrait and short-landscape layouts fit, and
portrait/desktop screenshots were inspected locally. No page exceptions occurred.
The 60 deterministic cases and five prior browser suites also pass.

## Parenthood willingness follow-up

The user chose allowing hesitant spouses to reconsider. Three new deterministic
cases verify a low-baseline spouse crossing the threshold through real varied
romance actions, falling readiness when the bond deteriorates, no gains/RNG from
repeated planning requests, shared cooldown/daily limits, round-trip readiness,
same-sex biological limits and existing-marriage boundaries. All 63 cases pass,
including the exact frozen released-v4 payload.

The new [parenthood browser scenario](../tools/browser-parenthood.cjs) passes four
groups. Setup fabricates a valid legacy-shaped marriage with a hesitant, compatible
partner and controlled trust/affection; it is not evidence of natural courtship.
The fixture loads through native Continue. Subsequent family discussion, varied
relationship actions, birth and save/reload use actual UI/game rules. Clock,
proximity and needs are controlled as in the existing generation suite. The
scenario proves that the same formerly hesitant spouse can become willing and
have a valid birth cohort. All six prior browser suites also pass.

No new save fields, stored topic counters, RNG stream or schema version is needed.
Discussion itself changes only existing interaction budgets/timestamps/outcome;
relationship gains come from the ordinary actions. The F8 inspector remains
read-only and now distinguishes baseline preference from effective willingness.
No page exceptions occurred. These changes do not enable autonomous NPC families.
