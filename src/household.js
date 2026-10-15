// Derived support only; marriage history and biological parentage stay separate.
function householdSupport(world, character) {
    const partnered=!!world.romance.spouse(character)?.actual.life.alive;
    return {metabolism:partnered ? .88 : 1, refugeHealing:partnered ? 2.1 : 1.8};
}
