# Bounded Phase 4A handoff — 2026-10-16

V0.4.0 implements one voluntary nonlethal spar with an introduced adult. It
preserves the survival/family world, stable IDs, private ancestry, family support,
growth stages, action bubbles, succession, reversible F8 and offline standalone
HTML. The scope stops before lethal attacks, lasting injuries, law, guards,
witnesses, civilization, weapons, loot or new population/archive rules.

## Repository and checkpoints

Started on clean merged `main` at `b8caef8`. PRs #1 and #2 are merged. Work is on
**`codex/phase-4a-sparring`**; do not resume those older branches.

1. `c8aceb2`: pure contour/contact/swing/guard rules and explicit gate decision;
   88 rule cases and all ten existing Chromium suites passed.
2. `b013f60`: walking invitations, deterministic opponent, desktop/touch controls,
   feedback, retreat/end and pause/family/death integration; 95 rule cases and
   eleven browser suites passed. Three layouts were inspected locally.
3. `6585a8b`: final persistence checkpoint, with live wind-up save/shutdown/Continue,
   native export/import, daughter combat, natural death/pending heir, policy
   regressions, real corner/terrain contact and this handoff. See [QA](QA_REPORT.md)
   for totals.

No push, PR creation or merge was performed. Raw profiles, screenshots, JSON and
test exports remain under ignored local output. Normal player saves were not used.

Continuation verification on 2026-10-16 started clean at `6585a8b`: rebuilt HTML
has no diff, 96/96 rule cases, all twelve browser scripts, build agreement and
documentation checks pass again. See [the QA refresh](QA_REPORT.md) for environment
and evidence limits. Follow-up edits correct documentation and a stale migration
success label only; human balance remains deferred and unverified.

## Entry gate and limits

The user explicitly selected: “Explicitly defer the human playtest for bounded
Phase 4A; keep it documented as unverified.” This supersedes older unwaived gate
statements. Unassisted survival, travel, partner discovery, courtship and competing
NPC commitments remain **unverified**. Automated/staged evidence is not human play.
Firefox/Safari, physical phones, assistive technology, abrupt process termination
and long human sessions remain unverified. Population is finite with possible
extinction; retain full archives, 256 total records and the 2 MB envelope.

## Playing and persistence

Greet → Talk → Invite to spar. Both participants need health 35+, food/water 30+
and stamina 30+. Negative effective trust refuses. J strikes; hold K to guard;
movement sets facing. Touch has equivalent controls. Watch amber wind-up sectors.
End spar is available in the action bar, Pause and Family. Two seconds beyond
220 units, health 1 or exhausted stamina also ends practice. Ordinary actions end
it; inspecting/saving only freezes it. Family days require ending it first.
Spent health/stamina stay; recover at a supplied refuge. No relationship reward.

Rules live in [combat-rules](../src/combat-rules.js); transient encounter/AI in
[sparring](../src/sparring.js). Combat resolves registry IDs every fixed 60 Hz step.
The shared death path cancels the encounter before succession or a pending strike.
NPC ordinary navigation/resources are suspended only for the active opponent.
Existing health/stamina save normally. Encounter, target, swing and held input do
not persist. Loading ends practice, retains exact saved world/vitals and pauses.
Failed imports leave live practice and native slots intact. Schema v5, generator
v1, original keys, frozen v4 payloads and v1–v4 readers are preserved.

Exact profile/timing/balance defaults are in [implemented rules](FAMILY_RULES.md).
The new suites are [sparring UI](../tools/browser-sparring.cjs) and
[native persistence/generations](../tools/browser-sparring-persistence.cjs).
Run the [README validation commands](../README.md#source-and-validation).

## Next-session prompt

> Continue The Flatland on `codex/phase-4a-sparring` in
> `D:\Games\Flatland-A-Web-Based-Game`. Inspect Git status/log first and preserve
> uncommitted work. Main's entry checkpoint was `b8caef8`; PRs #1 and #2 are merged.
> Read README, PHASE4A_HANDOFF, PHASE4A_PLAN, FAMILY_RULES, QA_REPORT and
> IMPLEMENTATION_STATUS. Bounded voluntary nonlethal sparring is implemented.
> Human balance was explicitly deferred; keep it unverified and do not claim
> staged QA as human evidence. Verify build/docs, 96 rule cases and all twelve
> browser scripts. Preserve save v5/generator v1, IDs, full archives, original
> slots, ancestry privacy, family bonds, growth, bubbles, succession, F8 and
> standalone HTML. Keep raw evidence local. Do not add lethal combat, persistent
> injuries, law, guards or civilization without a separate agreed scope.
