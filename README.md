# The Flatland
## Version 0.3.1 — Action bubbles and playable generations

Phase 3.5 core architecture is hardened: a stable character registry separates
living actors from deceased records; save validation/migration runs independently
of browser storage; family views, observer notebooks and household support have
explicit boundaries. Population rules remain unchanged. The selected next design
direction is [autonomous NPC families](docs/POPULATION_RENEWAL_DESIGN.md).

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
2. Click or tap a citizen and choose Greet. You walk over automatically.
3. Discuss partnership preferences and try different courtship activities in the Romance bubble. Trust
   and attraction are separate; an excellent friend can decline romance.
4. Propose once affection, trust and mutual interest are established. Marriage
   lowers food/water use by 12% and improves playable refuge healing.
   Under Affection → Commitment, **Discuss children** explains current readiness.
   A hesitant spouse can reconsider as trust and affection grow; asking repeatedly
   does not increase willingness.
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
| Conversation | Action bubble; 1–4 select visible choices | Tap an action |
| Courtship / proposal | Romance → actions / Commitment | Same bubble choices |
| Family, years, heir selection | Condition panel or Pause → Family | Same buttons |
| Close citizen / family panel | Escape or close button | Close button |
| Pause / help | P / H | Pause / Help |
| Save, load, export, import | Pause menu | Pause menu |

Citizen menus and Family **pause the world while choosing**. Selecting an action
resumes time and walks over automatically; brief replies fade on their own.
Manual movement, Escape or Cancel stops a queued approach. Details opens the
optional notebook. Gathering fills your pack without automatically eating/drinking. Each pack
holds eight. Food restores up to 38, water 45, capped at 100. Field rest restores
stamina and reduces consumption; refuge rest heals when food/water both exceed 30.

## A small menu, a brief reply

New lives start without an instruction wall. Context prompts teach movement,
gathering and using supplies. Citizen bubbles show at most four choices, with
more topics one level deeper. Greet, Talk, Romance and Family use existing rules;
Details holds discovered facts and unconfirmed rumors. Short speech bubbles
replace mechanical explanations after actions. Family traits and histories expand
on demand. Help retains optional rule explanations.

## Relationships and inheritance

Courtship shares the existing three-second social cooldown and six meaningful
exchanges per citizen per day, with a further three-action romance cap, diminishing
gains and repeated-topic limits. NPC preferences, attraction, social expectations
and willingness to raise children vary. Separation retains history and children.
Family willingness combines a stable personal preference with the current bond.
Varied relationship actions can help hesitant spouses become willing, while falling
trust/affection can make them unready again. F8 shows baseline and current values.

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

### Reversible testing inspector

With an expedition loaded, press **F8** to open **All information**. Press **F8**
again, **Escape**, or **Return to normal** to close it. On touch, use
**Pause → Testing → All information**. Reload this updated HTML to get the feature;
existing saves work without starting a new game.

The inspector pauses simulation and shows hidden genomes, ancestry, preferences,
relationships and raw records. Search any name/ID, including deceased ancestors,
or select **World & dynasty** for the complete save snapshot and terrain records.
**Full record** expands the detailed JSON. It does not change discoveries, trust,
RNG or save data. Private details are cleared on close, and inspection mode is
never saved. Ordinary bubbles, notebooks and family screens keep their usual
discovery rules.

For console-driven testing with the optional debug query, run
`FlatlandDebug.inspect()` to toggle the same view. F8 and the touch button also
work without that query; the normal build still excludes the debug API.

Source fragments in [src](src/) share a strict lexical closure and assemble using
[the build script](tools/build.py). Edit source and rebuild instead of editing the
generated HTML. The [original Phase 1 baseline](baseline/the-flatland-phase1.html)
remains unchanged.

| Module | Responsibility |
|---|---|
| [genetics](src/genetics.js) | Pure staged inheritance and genome validation |
| [registry](src/registry.js) | Private stable-ID records and living world projections |
| [romance](src/romance.js) | Preferences, attraction, consent and marriage history |
| [family](src/family.js) | Birth, death, aging and succession commands/events |
| [family invariants](src/family-invariants.js) | Reciprocal spouse links and generation DAGs |
| [observer notebooks](src/observer-notebooks.js), [household](src/household.js) | Observer transfer and derived household support |
| [family view](src/family-view.js) | Privacy-safe family presentation DTO |
| [family UI](src/family-ui.js) | Paused register, years and heir selection |
| [save codec](src/save-codec.js), [migrations](src/save-migrations.js), [validation](src/save-validation.js) | Storage-independent schema readers and candidate validation |
| [persistence](src/persistence.js) | Native storage, slot fallback, installation and file I/O |
| [inspector](src/inspector.js) | Explicit, reversible private-truth view for testing |
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
node tools/browser-bubbles.cjs
node tools/browser-regressions.cjs
node tools/browser-architecture.cjs
node tools/browser-inspector.cjs
node tools/browser-parenthood.cjs
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
