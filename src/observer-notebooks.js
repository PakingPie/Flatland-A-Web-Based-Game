// Personal discoveries follow the observer; authoritative ancestry never does.
function captureObserverNotebook(world) {
    return {knowledge:Object.fromEntries(world.registry.all()
        .filter(c=>Object.keys(c.playerKnowledge.discoveredFacts).length || c.playerKnowledge.rumors.length || c.playerKnowledge.relationship.familiarity || c.playerKnowledge.relationship.trust)
        .map(c=>[c.id,copyJSON(c.playerKnowledge)])),reputation:copyJSON(world.social.reputation)};
}
function restoreObserverNotebook(world, book) {
    for(const c of world.registry.all()) c.playerKnowledge=book?.knowledge[c.id]
        ? copyJSON(book.knowledge[c.id]) : {observed:{},discoveredFacts:{},rumors:[],relationship:emptyRelationship()};
    world.social.reputation=book ? copyJSON(book.reputation) : {score:0,events:[]};
}
