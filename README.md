# The Flatland
## Version 0.3.0 — Courtship, families and playable generations

A lightweight offline Canvas survival and society simulation inspired by Edwin
Abbott's *Flatland*. Survive as an irregular triangle, meet citizens, court a
consenting partner, marry, raise children and continue as a chosen adult son or
daughter. Social prestige is fictional; it does not measure morality or fitness.

Open **[the-flatland.html](the-flatland.html)** in a browser. All code, styling and
graphics are embedded, without network assets, accounts, backend or frameworks.
For a stable browser storage origin, serve this folder locally:

```sh
python -m http.server 8000 --bind 127.0.0.1
```

Open [the local game](http://127.0.0.1:8000/the-flatland.html). Return with the same
browser profile, hostname, port and protocol to find your saves. Python only
serves static files. Direct file opening works in tested Chromium; file-origin
storage durability has not been established.

## Playing a generation

1. Gather food and water, eat/drink from your pack, and rest at refuges to heal.
2. Approach citizens, introduce yourself and vary conversation topics over days.
3. Discuss partnership preferences and try different courtship activities. Trust
   and attraction are separate; an excellent friend can decline romance.
4. Propose once affection, trust and mutual interest are established. Marriage
   lowers food/water use by 12% and improves playable refuge healing.
5. Open **Family & succession** from your condition panel or Pause. Eligible,
   consenting spouses can have two to four individually inherited children.
6. At a refuge use **Live 1 / 5 family years**. Community subsistence covers needs
   and preserves packed supplies; aging, adulthood and natural deaths still occur.
7. Children become adults at 18. At 40 you may retire and choose a living adult
   biological descendant. Adult descendants can also continue upon your death.
8. The selected heir becomes playable in the **same world**. Siblings and retired
   founders remain NPCs. Save and Continue to resume that generation.

Death with no living adult descendant ends the playable lineage, including when
all surviving children are minors. There is no automatic guardianship/adoption.
The dynasty summary and family history remain available. An older manual save is
an explicit recovery option.

Same-sex couples can court, marry, receive the same household benefits and retain
existing biological children as potential heirs. Joint biological births currently
require a male and female spouse. Marriage and biological parentage are separate.

## Controls

| Action | Desktop | Touch |
|---|---|---|
| Move / sprint | WASD or arrows / hold Shift | Joystick / hold Sprint |
| Gather | Hold E | Hold Gather |
| Eat / drink | F / R | Eat / Drink |
| Rest / stand | Space | Rest |
| Talk / inspect | T / click citizen | Talk / tap citizen |
| Conversation | 1–7 or buttons | Scroll and tap options |
| Courtship / proposal | Citizen panel buttons | Scroll and tap options |
| Family, years, heir selection | Condition panel or Pause → Family | Same buttons |
| Close citizen / family panel | Escape or close button | Close button |
| Pause / help | P / H | Pause / Help |
| Save, load, export, import | Pause menu | Pause menu |

Conversation does **not** pause survival. Family does. Walking closes the citizen
panel. Gathering fills your pack without automatically eating/drinking. Each pack
holds eight. Food restores up to 38, water 45, capped at 100. Field rest restores
stamina and reduces consumption; refuge rest heals when food/water both exceed 30.

## Relationships and inheritance

Courtship shares the existing three-second social cooldown and six meaningful
exchanges per citizen per day, with a further three-action romance cap, diminishing
gains and repeated-topic limits. NPC preferences, attraction, social expectations
and willingness to raise children vary. Separation retains history and children.

Observations, claims and unverified rumors remain distinct. Marriage never
reveals private ancestry. The family register records household births, parents,
siblings, marriages, deaths and playable history. A daughter's line form never
reveals her latent side count or irregular-ancestry carrier state.

Triangles must progress through irregular → isosceles → equilateral before gaining
sides. Regular offspring retain side count or gain at most one, up to 32. Maternal
carriers can reintroduce irregularity. Irregular polygons with four or more sides
keep their sides while repairing regularity. Physical traits vary independently of
rank. See [implemented rules and balance defaults](docs/FAMILY_RULES.md).

## Saving and recovering progress

- Independent **manual and automatic slots** retain their original browser keys.
  Autosaves occur every 30 simulated seconds, on pause/family screens, after family
  actions and on supported page lifecycle events.
- **Continue** selects the newest valid save, falling back when necessary. Loads
  pause, except ended dynasties and pending heir choices.
- **New expedition** confirms before replacing progress and preserves the manual slot.
- **Export save file** downloads portable JSON. **Import save file** validates before
  replacing active progress and asks before discarding an active expedition.
  Browser slots remain until an explicit save or subsequent autosave.
- Schema **v4**, generator **v1**, supports v1/v2 and the v3 marriage checkpoint.
  Phase 2A inventory, resources, NPC state, knowledge, trust, reputation and RNG
  migrate. Failed loads/imports do not replace active progress.

Saves stay in their browser/profile/origin. Clearing site data removes them; keep
exports for important dynasties. Abrupt termination can skip lifecycle saves.
Multi-tab protection remains best-effort rather than atomic locking; use one active
game tab. Storage denial/full storage shows a visible error without preventing
play or silently erasing older slots.

## Source and validation

Source fragments in [src](src/) share a strict lexical closure and assemble using
[the build script](tools/build.py). Edit source and rebuild instead of editing the
generated HTML. The [original Phase 1 baseline](baseline/the-flatland-phase1.html)
remains unchanged.

| Module | Responsibility |
|---|---|
| [genetics](src/genetics.js) | Pure staged inheritance and genome validation |
| [romance](src/romance.js) | Preferences, attraction, consent and marriage history |
| [family](src/family.js) | Births, aging, genealogy, succession, dynasty validation |
| [family UI](src/family-ui.js) | Paused register, years and heir selection |
| [persistence](src/persistence.js) | Migration, native storage, file export/import |
| [game](src/game.js), [world](src/world.js) | Existing survival and integration |

Python 3.10+ and Node 18+ run dependency-free checks:

```sh
python tools/build.py
python tools/build.py --check
python tools/check_docs.py
node --test tools/test.cjs
```

Real browser checks require Playwright and an installed Chromium. Each script
starts its own ephemeral localhost server and isolated context/profile:

```sh
node tools/browser-smoke.cjs
node tools/browser-generations.cjs
node tools/browser-regressions.cjs
```

Use `FLATLAND_NODE_MODULES` for a bundled Playwright package directory and
`FLATLAND_CHROMIUM` for an explicit executable. Otherwise normal module resolution
and Playwright discovery apply. Screenshots, test JSON and isolated profiles remain
in the ignored local output directory and are not published with the source.

See [current QA](docs/QA_REPORT.md), [checkpoints](docs/IMPLEMENTATION_STATUS.md),
[the roadmap](docs/ROADMAP.md) and [Phase 3.5 handoff](docs/PHASE35_HANDOFF.md).

## Current limits

There is no autonomous NPC courtship/reproduction, immigration, adoption or new
founding population. The founding society ages; unrelated fertile partners can
eventually run out in a long dynasty. Validation covers Generation 2 control and
Generation 3 births, rather than an indefinitely replenishing population.
Births are immediate abstract events with no scheduled pregnancy. The tree is a
compact linked register. Budgets are 256 total individuals, including deceased
records, and a 2 MB save envelope; failures visibly preserve existing saves.

Firefox, Safari, physical phones, long human play sessions and abrupt process-kill
durability remain unverified. QA documents all scenario controls. Combat, law,
economy, politics and multiplayer are outside this milestone.

## Repository

[PakingPie/Flatland-A-Web-Based-Game](https://github.com/PakingPie/Flatland-A-Web-Based-Game)
uses the [MIT license](LICENSE), Copyright (c) 2026 PerkinPie. Main and the interrupted
Pro branch are preserved. Its verification workflow was recovered without merging
divergent history. This work does not deploy a hosted game or automatically merge
the pull request. The project is independent of Aetherion and the Unreal projects.
