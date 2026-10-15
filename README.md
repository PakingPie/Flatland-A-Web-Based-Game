# The Flatland
## Phase 1.1 + Phase 2A — Living Society (0.2.0)

A lightweight, offline-capable Canvas survival and social simulation inspired by Edwin Abbott's *Flatland*. You begin as an irregular triangle. Find food and water, manage your strength, meet persistent citizens, and learn the difference between a visible outline, a public claim, and a person you actually know.

**Current scope:** survival, persistence, identities, conversations, trust, reputation, and progressive discovery. There is no courtship, marriage, reproduction, aging, succession, evolution, combat, or advanced economy yet. Social prestige is a fictional institution, not a measure of intelligence, morality, or biological fitness.

> **Planning:** [v0.3 Development Roadmap](docs/ROADMAP.md). The external source archive also holds the original automated test harness, screenshots, and historical Git bundle; those supplementary files have not yet been imported into this repository.

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

**Validation limitation:** serialization, recovery, migration and save errors passed automated tests using an explicit in-memory storage adapter. This runner blocks file/localhost browser navigation, so native localStorage durability across an actual browser shutdown remains unverified here. A real close/reopen test is included for an unrestricted local environment. See `docs/QA_REPORT.md`.

## Source layout

```text
baseline/                 Untouched original Phase 1 HTML and historical QA
src/                      Focused JS fragments, HTML shell, CSS
  core.js                 Constants, math, seeded RNG, common helpers
  characters.js           Identity/genome/body/runtime, observable presentation
  navigation.js           Collision broad-phase and A* navigation
  world.js                Seeded generation, resources, NPC survival/AI
  social.js               Public standing, identities, relationships, safe views
  persistence.js          Versioned snapshots, validation, storage and migration
  input.js                Keyboard, pointer and touch input
  renderer.js             Camera, Canvas drawing, minimap
  game.js                 Fixed-step controller, survival, menus and HUD
  social-ui.js            Conversation and discovered-information panel
  bootstrap.js            Startup and opt-in QA hooks
  shell.html / style.css  Accessible UI structure and responsive layout
tools/build.py            Deterministic single-file assembly
tests/                   Automated tests and a genuine legacy save fixture
docs/                     Design, architecture, development, QA and setup
the-flatland.html        Included playable build
```

The fragments share one strict lexical closure, not a framework or runtime loader. Build with `python tools/build.py`; verify with `python tools/build.py --check`. Do not edit the generated HTML directly. The original supplied HTML is preserved byte-for-byte at `baseline/the-flatland-phase1.html`.

## Development and tests

Python 3.10+ is recommended for tooling. The observed test environment was Python 3.13.5, Playwright 1.57.0, Chromium 144.0.7559.96 on Linux. Node is optional for syntax checking; the game itself does not require Node.

```sh
python -m venv .venv
# Activate: source .venv/bin/activate   (Windows: .venv\Scripts\activate)
python -m pip install -r requirements-dev.txt
python -m playwright install chromium
python tools/build.py --check
python tools/test.py
```

`CHROMIUM_PATH` can select an existing Chromium executable. `tools/test.py` runs the current suites and reports a blocked native-persistence test separately. Use `python tools/test.py --require-native` for an acceptance gate that fails when native durability cannot be verified. Test dependencies are development-only.

**Observed result:** 66 automated checks passed, none failed; one native browser-persistence acceptance test was environment-blocked, not passed. See `docs/QA_REPORT.md` and archived machine-readable results under `docs/qa/`. Screenshots were visually inspected; no unassisted human playthrough or physical-phone certification is claimed.

## Repository and ownership

A local `main` branch with separate baseline, Phase 1.1, and Phase 2A commits is prepared. **No remote GitHub repository was created or pushed**: the connected GitHub actions available for this task were read-only. The source delivery contains a Git bundle preserving the full local history. See `docs/GITHUB_SETUP.md` for reconstruction and private creation instructions for `PakingPie/the-flatland`.

No open-source license was selected. No public deployment or GitHub Pages was enabled. This project is independent of Aetherion and the Unreal projects.

## Design and next milestone

`docs/GAME_DESIGN.md` preserves the approved later-phase rules; `docs/ARCHITECTURE.md` explains implementation boundaries. Before starting Phase 2B, run native persistence acceptance on the intended browser. Then introduce courtship and voluntary partnership with marriage separate from biological parentage; do not add reproduction or side-count mutation as generic random changes. Those systems need their own acceptance gates and saved-state migrations.
