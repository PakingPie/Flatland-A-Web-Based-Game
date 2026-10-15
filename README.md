# The Flatland
## Phase 1.1 + Phase 2A — Living Society (0.2.0)

A lightweight, offline-capable Canvas survival and social simulation inspired by Edwin Abbott's *Flatland*. You begin as an irregular triangle. Find food and water, manage your strength, meet persistent citizens, and learn the difference between a visible outline, a public claim, and a person you actually know.

**Current scope:** survival, persistence, identities, conversations, trust, reputation, and progressive discovery. There is no courtship, marriage, reproduction, aging, succession, evolution, combat, or advanced economy yet. Social prestige is a fictional institution, not a measure of intelligence, morality, or biological fitness.

> **Planning:** [v0.3 Development Roadmap](docs/ROADMAP.md). Phase 1.1 + 2A are implemented in the included v0.2.0 build; Phase 2B onward is planned. See the [QA report](docs/QA_REPORT.md) for recorded evidence and its limits.

## Play

Open **`the-flatland.html`** in a browser. All game code, styling, and graphics are embedded. The game has no external assets, CDNs, game libraries, account, backend, or build-time dependency to play the included distributable.

For a stable storage origin, serving the folder locally is recommended:

```sh
python -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/the-flatland.html`. Keep the same browser profile, hostname, port, and protocol when returning to your saves. Python only provides static files; it is not a gameplay backend. Opening a local file is also possible, but native `file:` storage behavior needs checking in the browser being used.

Choose **Begin new expedition** or **Continue saved expedition**. The default seed is `abbott-1884`. A day lasts 120 seconds of unpaused simulation. Your expedition goals remain: survive three full days, gather 12 provisions, and visit two refuges. Completion does not stop the simulation.

### Controls

| Action | Keyboard / mouse | Touch |
|---|---|---|
| Move | WASD / arrows | Left joystick |
| Sprint | Hold Shift | Hold Sprint |
| Gather nearest accessible resource | Hold E | Hold Gather |
| Eat / drink from pack | F / R | Eat / Drink |
| Rest / stand | Space | Rest |
| Talk to nearest citizen | T | Talk |
| Inspect a specific citizen | Hover / click | Tap the citizen |
| Choose conversation topic | 1–7, or click | Tap an option; scroll for more |
| Close citizen panel | T / Escape / close button | Close button |
| Pause / resume | P; Escape when panel is closed | Pause / Resume |
| Field guide | H | Help |
| Save / load | Pause menu | Pause menu |

Gathering puts resources in your pack; it does **not** automatically feed or hydrate you. Food restores up to 38 and water up to 45, capped at 100. You can carry eight of each. Walking away with movement keys closes the citizen panel. The panel is not a pause screen: needs continue to fall and other citizens continue moving. Pause when you need time to read without survival pressure.

### Rest

Field rest restores stamina quickly and reduces food use by 35% and water use by 28%, but does not heal. Refuge rest has the same benefits and heals only while food and water are both above 30. The context bar explicitly shows which rest mode is active. Movement interrupts resting.

### Meeting citizens

An unknown citizen reveals only visible form, apparent institutional class, activity, and approximate outline size. Introduce yourself, ask about work or interests, and return over multiple days. Seven compact conversation topics offer context-dependent positive responses, refusals, and negative reactions.

The notebook distinguishes **observations**, **self-reported claims**, **unverified rumors**, and a reserved **confirmed** source category. A claimed name or job is not an omniscient read of the character. Trusted friends may disclose family stories; reserved people may still refuse. Hidden genomes and verified genealogies remain undiscovered. Independent rumor verification and investigation are not implemented.

Familiarity and trust are separate. Conversation has a three-second cooldown, six meaningful exchanges per citizen per day, diminishing rewards, and repeated-topic penalties. Intrusive family questions can damage trust and your local reputation. Some citizens are prejudiced against the player's outline. Their prejudice is not presented as biological truth.

## Saving and recovering progress

- **Manual:** Pause → Save manually. Pause → Load manual save explicitly restores that slot.
- **Automatic:** every 30 seconds of simulated play, when pausing/opening the guide, and on supported page lifecycle events. Continue selects the newest valid manual/autosave and can fall back to an older valid one.
- **New game:** asks before replacing existing progress; replaces the automatic slot, preserving the independent manual slot. Loads return paused. An ended autosave stays ended; loading an earlier manual save is an explicit recovery option.

Saves remain in this browser/profile/origin. There is one manual slot and one automatic slot per origin, not one pair per seed. Clearing site data removes saves; changing browser, profile, hostname, or port does not transfer them. There is no cloud sync or export/import UI. Abrupt termination may skip lifecycle saves. Best-effort multi-tab conflict protection is not atomic locking; use one game tab for reliable play.

Malformed, incompatible, or inaccessible saves produce a visible message without replacing the current expedition. Full/unavailable storage does not prevent playing. The format is version 2 with world-generator version 1; genuine version-1 Phase 1.1 saves migrate. Original Phase 1 had no persistent saves.

**Validation limitation:** the [QA report](docs/QA_REPORT.md) records historical automated checks using an explicit in-memory storage adapter; the original harness and raw artifacts are unavailable in this repository. Its separate [independent playtest](docs/QA_REPORT.md#independent-playtest-2026-10-15) records one successful native save/close/reopen/Continue cycle in headless Chromium on Linux. That limited observation does not establish durability across other browsers, origins, repeated cycles, or long sessions.

## Source layout

```text
baseline/                 Untouched original Phase 1 HTML
src/                      Focused JS fragments, HTML shell, CSS
src/core.js               Constants, math, seeded RNG, common helpers
src/characters.js         Identity/genome/body/runtime, observable presentation
src/navigation.js         Collision broad-phase and A* navigation
src/world.js              Seeded generation, resources, NPC survival/AI
src/social.js             Public standing, identities, relationships, safe views
src/persistence.js        Versioned snapshots, validation, storage and migration
src/input.js              Keyboard, pointer and touch input
src/renderer.js           Camera, Canvas drawing, minimap
src/game.js               Fixed-step controller, survival, menus and HUD
src/social-ui.js          Conversation and discovered-information panel
src/bootstrap.js          Startup and opt-in QA hooks
src/shell.html            Accessible UI structure
src/style.css             Responsive layout
tools/build.py            Deterministic single-file assembly
tools/check_docs.py       Relative documentation link and path checks
docs/                     Roadmap and QA report
the-flatland.html        Included playable build
```

The fragments share one strict lexical closure, not a framework or runtime loader. Build with `python tools/build.py`; verify with `python tools/build.py --check`. Do not edit the generated HTML directly. The original supplied HTML is preserved byte-for-byte at `baseline/the-flatland-phase1.html`.

## Development and validation

Use Python 3.10+ for the dependency-free build and documentation checks. Edit the source fragments, then rebuild and check the distributable:

```sh
python tools/build.py
python tools/build.py --check
python tools/check_docs.py
```

The build check verifies source/build agreement; the documentation check verifies relative links and file/directory references in this README and the Markdown documents directly under `docs/`. Neither check exercises gameplay or browser persistence.

**Historical results:** the [QA report](docs/QA_REPORT.md) records 66 automated checks passed, none failed, and one environment-blocked native-persistence acceptance test. These results were not rerun during this documentation cleanup; the original test runner, fixtures, machine-readable results, and screenshots are absent. See its separate independent playtest subsection for the limited native-persistence observation.

## Known gaps

No original source archive was available for this cleanup. The repository does not include the original game-design, architecture, GitHub-setup, or development guides; development dependency manifest; automated test runner, test suites, or legacy save fixture; raw QA artifacts; screenshots; historical Phase 1 QA report; or original development-history bundle. These have not been recreated from memory. The QA report preserves the existing recorded results, but their underlying artifacts cannot currently be inspected or reproduced using an included gameplay test suite.

## Repository and ownership

The public repository is [PakingPie/Flatland-A-Web-Based-Game](https://github.com/PakingPie/Flatland-A-Web-Based-Game), with default branch `main`. Clone the existing repository to work locally:

```sh
git clone https://github.com/PakingPie/Flatland-A-Web-Based-Game.git
```

At the reviewed snapshot (`e663cb2`, 2026-10-15), the public history contains five commits: the initial commit, roadmap, overview, a combined Phase 1.1 + 2A source/build import (`9c5b3ad`), and the subsequent Phase 1 baseline import (`e663cb2`). It does not contain separate original Phase 1.1 and Phase 2A development commits. No history was reconstructed for this cleanup.

The project uses the [MIT license](LICENSE), Copyright (c) 2026 PerkinPie. Repository visibility does not establish a hosted game deployment. This project is independent of Aetherion and the Unreal projects.

## Design and next milestone

The [roadmap](docs/ROADMAP.md) records later-phase plans and unresolved design questions. Before starting Phase 2B, validate native persistence on the intended browser, including repeated close/reopen cycles. Courtship and voluntary partnership are planned, with marriage separate from biological parentage. Reproduction and side-count mutation need their own acceptance gates and saved-state migrations.
