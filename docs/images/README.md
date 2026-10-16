# README image sources

The banner is a hand-authored SVG illustration using the game's palette and
geometric visual language. It is not a gameplay screenshot.

The four PNGs are curated captures of the current standalone game:

- `explore.png`: the ordinary world/HUD at the start of a demo expedition.
- `relationships.png`: the actual paused courtship action bubble.
- `succession.png`: actual adult children with enabled successor choices.
- `life-stages.png`: a staged comparison using the game's renderer, with controlled
  ages, matching polygon genomes and public labels for clarity. Line-form private
  heredity is not shown.

Generate candidates from the repository root with
`node tools/capture-readme.cjs`, using the same Playwright/Chromium environment
variables as the browser suites. The tool writes to ignored
`output/playwright/readme`; it does not overwrite these curated assets.
Visually review candidates before copying the selected PNGs into this directory.

These captures use isolated demo worlds, controlled positions/time and test-owned
browser storage. They use the current rendering and gameplay rules; they are not
evidence of unassisted human balance. No normal player profiles, exported saves,
F8 private-truth views or raw QA evidence are published here. Images are original
project material covered by the repository's MIT license.
