# Save compatibility fixtures

- `phase2a-v2.json`: genuine released Phase 2A source at `6e565b7`.
- `phase2b-v3.json`: genuine marriage checkpoint source at `0d34434`.
- `released-v4.json`: frozen `87feb3c` source executed by
  `node tools/freeze-v4-fixture.cjs`. Controlled UI-rule courtship, marriage,
  births, aging, daughter succession, archived founder notebook and deaths.
  Timestamp fixed for reproducibility. No normal player data is used.

The v1 case remains explicitly synthetic, derived from the v2 fixture. Keep these
inputs frozen when production save code changes. The v4 fixture must round-trip
with the same complete payload, including private data and RNG continuation.
