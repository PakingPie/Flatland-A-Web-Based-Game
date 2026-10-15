# QA report — Phase 1.1 + Phase 2A

Date: 2026-10-15. Current-build testing used Chromium 144.0.7559.96 on Linux, Playwright 1.57.0 and Python 3.13.5. This is a report of executed checks, not a promise of universal browser compatibility.

## Final automated outcomes

| Suite | Passed | Failed | Blocked / unverified |
|---|---:|---:|---:|
| Current Phase 1 regression | 27 | 0 | 0 |
| Persistence and camera/rest acceptance | 15 | 0 | 0 |
| Phase 2A social and responsive UI | 17 | 0 | 0 |
| Recovery/input edge cases | 7 | 0 | 0 |
| Native localStorage browser-close/reopen | 0 | 0 | 1 |
| **Total** | **66** | **0** | **1** |

Machine-readable results are in `docs/qa/phase2a-*.json` and `docs/qa/native-storage.json`. Earlier Phase 1.1 checkpoint results are also archived but are **not counted again**. The untouched Phase 1 report under `baseline/` is historical evidence only.

## Critical environment limitation

The environment denied file and localhost browser navigation with `ERR_BLOCKED_BY_ADMINISTRATOR`. The game was therefore loaded as the exact built HTML with Playwright set_content on `about:blank?debug=1`. This is real Chromium executing real Canvas, DOM, mouse/keyboard and emulated touch, not a mocked rendering engine.

On that opaque origin, native localStorage access is denied. Persistence/social tests **explicitly install a memory-backed localStorage adapter**. They exercise the actual game's save capture, validation, restore, migration, error handling and slot-selection logic, but **do not prove native on-disk persistence**. The fresh-document test restores an adapter fixture, not data read from a reopened physical browser profile. The unmodified unavailable-storage case was tested separately and remained playable.

`tests/test_native_storage.py` attempts a genuine localhost, native localStorage, persistent browser-profile close/reopen sequence without a storage adapter. It was run here and blocked at navigation; the archived report says `nativePersistenceVerified: false`. No policy bypass was attempted. Native disk durability is an outstanding acceptance check to run in the target environment, using `python tests/test_native_storage.py` or `python tools/test.py --require-native`.

## Executed coverage

**Survival regression:** reproducible complete snapshots after 5,400 fixed simulation steps; 24 seeds with valid actors/resources and connected refuges; normalized movement, sprint/stamina and collisions; gathering, inventory caps, eating/drinking and resource renewal; field and refuge resting/healing; pause/resume, blur/input clearing, death/restart; objective completion and continuing sandbox; hover privacy, seed input and literal-safe text; resizing, production debug exclusion, emulated joystick; no observed JavaScript exceptions or game network requests.

The six-minute simulated NPC soak observed 63 citizens moving over 100 units, 62 replenishing needs, and all expected seeking/walking/gathering/resting activity categories. Controlled player needs kept the run alive. It was an accelerated simulation test, not a six-minute real-time human playthrough. Objective completion also used controlled positioning/resources/needs rather than claiming natural difficulty was fully balanced.

**Persistence:** full mutable-state round trips and identical continuation including active AI paths/timers and RNG; independent manual/auto slots; 30-second autosave and pause save; fresh-document adapter restoration; malformed JSON, incompatible versions, wrong checksums, invalid IDs/counts/positions/vitals/paths/inventory/resources and unsafe properties; unchanged active progress on failed loads; full/denied storage; death and explicit recovery from the separate manual slot; latest-invalid fallback; a late storage-read failure before installation; synthetic cross-tab change notification and pre-write conflict detection.

Save-cost sampling over 20 Phase 2A saves measured approximately **0.85 ms mean / 1.2 ms maximum**, with a **52,583-character** representative save. These are serialization plus adapter-write measurements on this runner, not native storage latency, low-end phone performance or a maximum-save-size guarantee.

**Camera/rest:** all four boundaries at 1440×900, 1280×720, 390×844, 844×390 and 4000×2600, checking the player's padding against measured major HUD bounds (20 cases). Eight additional boundary checks use touch-enabled portrait/landscape contexts at DPR 2 and confirm reversible world/screen transforms. Field/refuge text explicitly states stamina/metabolic benefits and the healing gate.

**Social:** 64 unique reproducible names/IDs; stranger-safe views with no authoritative private fields; line-form geometry independent of latent side count; native hover/click, accepted introductions, keyboard topics and claimed work; intrusive-family penalties; 50 immediate clicks with no cooldown gains; daily caps and repeated-topic penalties; trust development over days with explicit family disclosure; max-trust reserved citizen still refusing; deceptive occupation remaining a claim; generated inaccurate rumors remaining unverified; controlled reputation comparison; persisted discoveries/relationship/social RNG; genuine version-1 save migration; distant inspection cannot perform remote social actions; normal AI/survival continue while a speaker is selected; native restart-confirmation cancellation.

**Responsive interaction:** conversation/notes at 1440×900, 1280×720, 390×844 and 844×390. Emulated touch opened Talk, introduced a citizen, scrolled to the personal-family option, changed to discovered notes and closed the panel. Key screenshots were visually inspected and are included under `docs/screenshots/`.

## Review and hardening

Reviewed coordinate transforms, world-edge clamping, HUD occlusion, minimap overhang, input held across modals, keyboard focus, conversation distance, held speaker needs, knowledge provenance, claim/rumor handling, seed/RNG separation and save installation order. Changes include cached HUD-safe camera anchoring, clipped minimap viewport, inert underlying HUD under pause modals, touch landscape joystick adjustment, scroll hints, independent save slots, bounded candidate validation and acquiring storage state before installing a load. Required build fragments are no longer silently optional.

Intermediate harness errors were corrected and affected suites rerun before archiving passing results. Some isolated cases deliberately modify valid save fixtures or use debug teleport/vital hooks. Those controls are disclosed rather than represented as ordinary player behavior.

## Remaining limitations and untested areas

Native persistence after actual browser shutdown is blocked here, as explained above. Firefox, Safari, physical mobile devices, gamepad/accessibility assistive-technology testing, long real-time sessions, low-memory devices, process-kill durability and truly simultaneous multi-tab writes are unverified. Multi-tab safeguards are best-effort, not atomic locking. Only completed saves can survive an abrupt termination.

There is one manual slot and one automatic slot per browser origin; no cloud sync, save-management UI or save-file export/import. Social templates and balance are intentionally small; there is no global contact-search journal, independent rumor verification, simulated family tree, NPC-to-NPC social network, or operative later-phase family/evolution mechanic. No runtime exception remained in the executed scenarios, but this report does not claim an absence of all possible bugs.

## Local acceptance before the next milestone

Run the native persistence test in the intended browser environment, then manually play with the same hostname/port/profile: introduce a citizen, gather resources, save, close the browser, reopen and Continue. Confirm needs, location, named citizen notes and depleted resources; inspect all boundaries and rotate a physical mobile device. Keep native durability as a required gate before adding family state in Phase 2B.
