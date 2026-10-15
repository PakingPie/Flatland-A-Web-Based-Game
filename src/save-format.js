// Versioned, transactional local saves. Immutable terrain and identities are seeded;
// every mutable simulation field is restored into a candidate World before install.
// The checksum detects accidental corruption; it is NOT an anti-cheat mechanism.
const SaveFormat = Object.freeze({ name: 'the-flatland', version: 4, worldVersion: 1,
    keys: { manual: 'flatland.manual.v1', auto: 'flatland.auto.v1' }, maxBytes: 2_000_000 });
