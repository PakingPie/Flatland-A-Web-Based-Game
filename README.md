# The Flatland

*A tiny shape in a very complicated two-dimensional society.*

**The Flatland** is an in-development, browser-based survival, social simulation, and generational evolution game inspired by Edwin A. Abbott's *Flatland: A Romance of Many Dimensions*.

The player begins as an **irregular triangle** and must explore, collect resources, interact with polygon citizens, form relationships, and ultimately continue their family lineage through inherited—and occasionally mutated—geometry. The game's fictional caste system favors geometric regularity, but **social status and actual survival fitness are not the same thing**.

## Development status

An initial Phase 1 HTML5 Canvas prototype has been built and playtested **outside this repository**. The playable source has **not yet been committed here**, so this repository is currently a documentation starting point, not a runnable distribution.

The next agreed development batch is **Phase 1.1 (Polish & Persistence) + Phase 2A (Living Society)**.

## Roadmap

See **[Development Roadmap](docs/ROADMAP.md)** for milestones, acceptance criteria, long-term gameplay plans, and our approved **v0.3 family and evolution rules**.

| Milestone | Focus | Status |
| --- | --- | --- |
| Phase 1 | Canvas world and survival | External prototype; source pending |
| Phase 1.1 | Camera/HUD fixes, rest UX, save/load | Next |
| Phase 2A | Named NPCs, conversations, trust and discoveries | Next |
| Phase 2B | Courtship and marriage, including same-sex marriage | Planned |
| Phase 3 | Multiple births, strict geometric evolution, successor choice | Planned |
| Phase 4 | Combat and legal consequences | Planned |
| Phase 5 | Civilization, economy, and politics | Planned |

## Core design principles

- **The shapes are the characters.** Triangles, squares, polygons, and line-form women inhabit a continuous 2D world.
- **Discovery is earned.** Hovering reveals appearances, while relationships or investigation unlock names, history and uncertain claims.
- **Families are persistent.** Multiple children can be born in one event, with the player eventually choosing which eligible descendant to control.
- **Evolution has rules.** Irregular triangle → isosceles → equilateral → regular higher polygons. Additional sides are impossible before reaching an equilateral triangle. Irregular ancestry carried by a female partner may reintroduce irregularity.
- **Marriage is broader than reproduction.** Same-sex marriage is supported; under the initial design it produces no shared biological offspring, though an existing descendant can still inherit the lineage.
- **Hierarchy is satire, not endorsement.** Social standing is a cultural institution, not a measure of personal worth.

## Implementation direction

The initial prototype is plain **HTML5 Canvas + JavaScript**, with seeded world generation and optional deterministic QA hooks. Preserve lightweight, static-site-friendly delivery while modularizing the source as needed.

Instructions for running/testing the checked-in game will be added when the playable implementation is committed.

## License

See the repository's existing [LICENSE](LICENSE) file. This documentation does not change its terms.
