// Synthetic rule-created family + staged needs/positions; native UI/storage/browser restarts.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const {chromium}=process.env.FLATLAND_NODE_MODULES?createRequire(path.join(process.env.FLATLAND_NODE_MODULES,'_resolve.cjs'))('playwright'):require('playwright');
const out=path.resolve('output/playwright');fs.mkdirSync(out,{recursive:true});
const profile=fs.mkdtempSync(path.join(out,'spar-persistence-profile-'));
function familyFixture() {
    const files=['core','genetics','characters','registry','navigation','world','social','romance','household','family-invariants','observer-notebooks','family-view','family','renewal','approach','save-format','save-validation','save-migrations','save-codec','persistence'];
    const ctx=vm.createContext({console,structuredClone,performance,document:{getElementById:()=>({textContent:'',hidden:true}),querySelectorAll:()=>[]}});
    vm.runInContext(files.map(f=>fs.readFileSync(`src/${f}.js`,'utf8')).join('\n')+`
        const w=new World('family');w.social.reputation.score=5;
        const c=w.npcs.find(c=>c.actual.identity.sex==='female' && c.actual.life.ageYears<=60 && w.romance.compatibility(w.player,c).ok && w.romance.preferences(c).familyLife>=.3);
        c.x=c.px=w.player.x+40;c.y=c.py=w.player.y;w.social.learn(c,'name',c.publicIdentity.displayName);c.playerKnowledge.relationship.trust=30;c.playerKnowledge.relationship.familiarity=50;
        for(let day=0;day<5 && !w.romance.spouse(w.player);day++) {w.elapsed+=120;for(const t of ['compliment','outing','commitment']) {w.elapsed+=4;w.romance.interact(c.id,t);}}
        w.elapsed+=124;if(!w.romance.interact(c.id,'propose').ok)throw Error('Fixture marriage failed');
        const birth=w.family.birth();if(!birth.ok)throw Error('Fixture birth failed');
        for(const days of [5,5,5,5,1]) if(!w.family.advance(days).ok)throw Error('Fixture age failed');
        const daughter=birth.ids.map(id=>w.registry.get(id)).find(c=>c.body.form==='line');if(!daughter)throw Error('Fixture needs daughter');
        const store=Object.create(SaveStore.prototype);store.revision=0;store.game={world:w,runId:'spar-family-fixture',pack:{food:2,water:3},progress:{gathered:2,visited:new Set(),complete:false},gatherCooldown:0,warningLatch:{},effects:[],messages:[],noticeUntil:0};
        const raw=store.encode();store.decode(raw);globalThis.fixture={raw,target:c.id,daughter:daughter.id};`,ctx);
    return ctx.fixture;
}
(async()=>{
    const server=require('node:http').createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(fs.readFileSync('the-flatland.html'));});await new Promise(r=>server.listen(0,'127.0.0.1',r));
    const url=`http://127.0.0.1:${server.address().port}/?debug=1`;let context,page;const errors=[],results=[];
    const open=async()=>{context=await chromium.launchPersistentContext(profile,{headless:true,executablePath:process.env.FLATLAND_CHROMIUM||undefined,viewport:{width:1280,height:800}});page=context.pages()[0];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());await page.goto(url);};
    const payload=()=>page.evaluate(()=>JSON.parse(FlatlandDebug.exportSave()).payload),spar=()=>page.evaluate(()=>FlatlandDebug.sparring()),advance=n=>page.evaluate(n=>FlatlandDebug.advance(n),n);
    const restore=async raw=>{assert.deepEqual(await page.evaluate(raw=>FlatlandDebug.validateSave(raw),raw),[]);assert.equal(await page.evaluate(raw=>FlatlandDebug.importSave(raw),raw),true);await page.evaluate(()=>FlatlandDebug.manual());};
    const stage=async(target,changes={})=>{
        const raw=await page.evaluate(({target,changes})=>{
            const d=JSON.parse(FlatlandDebug.exportSave()),s=d.payload,p=s.characters.find(c=>c.id===s.currentPlayerId),c=s.characters.find(c=>c.id===target);
            Object.assign(p,{x:1928,px:1928,y:1152,py:1152,angle:0,prevAngle:0,vitals:{health:100,hunger:100,thirst:100,stamina:100},...changes});
            Object.assign(c,{x:1968,px:1968,y:1152,py:1152,angle:Math.PI,prevAngle:Math.PI,vitals:{health:100,hunger:100,thirst:100,stamina:100}});
            c.ai={...c.ai,path:[],pathIndex:0,wait:90,think:90,activity:'idle'};
            let h=2166136261;for(const ch of JSON.stringify(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}d.checksum=h>>>0;return JSON.stringify(d);
        },{target,changes});await restore(raw);await page.locator('#resumeBtn').click();
    };
    const invite=async target=>{await page.evaluate(id=>FlatlandDebug.openCitizen(id),target);await page.locator('[data-group="talk"]').click();await page.getByRole('button',{name:'Invite to spar',exact:true}).click();await advance(.1);assert.ok(await spar(),await page.locator('#dialogueText').innerText());};
    const restart=async expected=>{await context.close();context=null;await open();await page.locator('#continueBtn').click();await page.evaluate(()=>FlatlandDebug.manual());assert.deepEqual(await payload(),expected);assert.equal(await spar(),null);};
    try {
        const fixture=familyFixture();await open();await restore(fixture.raw);await stage(fixture.target);await invite(fixture.target);
        await page.keyboard.press('KeyJ');await advance(.1);assert.equal((await spar()).swings[(await payload()).currentPlayerId].phase,'windup');
        const transient=await spar();await page.keyboard.press('KeyP');await page.locator('#saveBtn').click();assert.deepEqual(await spar(),transient);const saved=await payload();
        await restart(saved);assert.equal(await page.evaluate(()=>FlatlandDebug.snapshot().state),'paused');
        await page.locator('#resumeBtn').click();await advance(.4);assert.equal((await payload()).characters.find(c=>c.id===fixture.target).vitals.health,saved.characters.find(c=>c.id===fixture.target).vitals.health);
        results.push('PASS native save during wind-up leaves live encounter intact; full Chromium shutdown/Continue keeps exact vitals/world and clears every swing');
        // Export/import with live practice remains transactional; an invalid file cannot cancel it.
        await restore(fixture.raw);await stage(fixture.target);await invite(fixture.target);await page.keyboard.press('KeyJ');await advance(.1);await page.keyboard.press('KeyP');
        const downloadPromise=page.waitForEvent('download');await page.locator('#exportSaveBtn').click();const download=await downloadPromise;const exported=path.join(out,'sparring-export.json');await download.saveAs(exported);
        const before=await payload(),active=await spar(),slots=await page.evaluate(()=>[localStorage.getItem('flatland.manual.v1'),localStorage.getItem('flatland.auto.v1')]);
        await page.locator('#saveFileInput').setInputFiles({name:'broken.json',mimeType:'application/json',buffer:Buffer.from('{bad')});await page.waitForFunction(()=>document.querySelector('#pauseScreen [data-save-status]').textContent.includes('Import failed'));
        assert.deepEqual(await payload(),before);assert.deepEqual(await spar(),active);
        await page.locator('#saveFileInput').setInputFiles(exported);await page.waitForFunction(()=>document.querySelector('#pauseScreen [data-save-status]').textContent.includes('Imported and paused'));
        assert.deepEqual(await payload(),before);assert.equal(await spar(),null);assert.deepEqual(await page.evaluate(()=>[localStorage.getItem('flatland.manual.v1'),localStorage.getItem('flatland.auto.v1')]),slots);
        results.push('PASS native export/import retains exact payload/vitals; malformed import keeps active spar and slots; valid import ends it paused');
        // Actual daughter control during a live encounter, preserving the same world and IDs.
        await restore(fixture.raw);await stage(fixture.target);await invite(fixture.target);await page.locator('#familyBtn').click();await page.locator(`[data-successor="${fixture.daughter}"]`).click();assert.equal(await spar(),null);
        assert.equal((await payload()).currentPlayerId,fixture.daughter);assert.equal(await page.evaluate(()=>FlatlandDebug.snapshot().player.body.form),'line');
        await stage(fixture.target);await invite(fixture.target);await page.keyboard.press('KeyJ');const h=(await payload()).characters.find(c=>c.id===fixture.target).vitals.health;await advance(.35);assert.ok((await payload()).characters.find(c=>c.id===fixture.target).vitals.health<h);
        await advance(.7);await page.keyboard.down('KeyK');const hp=await page.evaluate(()=>FlatlandDebug.snapshot().player.vitals.health);await advance(1.5);await page.keyboard.up('KeyK');assert.ok(await page.evaluate(()=>FlatlandDebug.snapshot().player.vitals.health)>=hp-6.4-.001);
        await page.screenshot({path:path.join(out,'sparring-daughter.png')});
        await page.evaluate(()=>FlatlandDebug.vitals({stamina:.05}));await page.keyboard.down('KeyK');await advance(.1);await page.keyboard.up('KeyK');assert.equal(await spar(),null);
        await stage(fixture.target);await invite(fixture.target);await page.keyboard.down('ShiftLeft');await page.keyboard.down('KeyA');await advance(3.9);await page.keyboard.up('KeyA');await page.keyboard.up('ShiftLeft');assert.equal(await spar(),null);
        await page.evaluate(()=>{FlatlandDebug.teleport(1728,1280);FlatlandDebug.vitals({health:40,hunger:80,thirst:80});});await page.keyboard.press('Space');await advance(2);assert.ok(await page.evaluate(()=>FlatlandDebug.snapshot().player.vitals.health)>43);
        await page.keyboard.press('KeyP');await page.locator('#saveBtn').click();await restart(await payload());
        results.push('PASS live daughter succession ends encounter; line-form heir strikes/guards/exhausts/retreats/heals, then native save/restart retains identity and family');
        // Real shared old-age death occurs on the same fixed step as a queued strike.
        await restore(fixture.raw);const original=await payload();
        await stage(fixture.target);await invite(fixture.target);
        const deathRaw=await page.evaluate(()=>{
            const d=JSON.parse(FlatlandDebug.exportSave()),s=d.payload,p=s.characters.find(c=>c.id===s.currentPlayerId);
            const hash=t=>{let h=2166136261;for(const ch of t){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
            const age=78+hash(`${s.seed}:lifespan:${p.id}`)%15-.002;p.actual.life.ageYears=age;
            p.identitySignature=hash(JSON.stringify({id:p.id,genome:p.actual.genome,form:p.actual.identity.bodyForm,age}));d.checksum=hash(JSON.stringify(s));return JSON.stringify(d);
        });
        // .24 simulated seconds remain: invitation accepts, death precedes the strike.
        await restore(deathRaw);await page.locator('#resumeBtn').click();await invite(fixture.target);
        await page.keyboard.press('KeyJ');await advance(.35);assert.equal(await spar(),null);assert.equal(await page.evaluate(()=>FlatlandDebug.snapshot().state),'family');
        assert.equal(await page.locator('#closeFamilyBtn').isDisabled(),true);assert.equal((await payload()).characters.find(c=>c.id===fixture.target).vitals.health,100);
        assert.equal((await payload()).family.history.filter(e=>e.kind==='death'&&e.ids.includes(original.currentPlayerId)).length,1);
        await page.locator('#familySaveBtn').click();const pending=await payload();await restart(pending);assert.equal(await page.evaluate(()=>FlatlandDebug.snapshot().state),'family');
        await page.locator(`[data-successor="${fixture.daughter}"]`).click();assert.equal((await payload()).currentPlayerId,fixture.daughter);assert.equal(await spar(),null);
        assert.deepEqual((await payload()).characters.map(c=>c.id).sort(),original.characters.map(c=>c.id).sort());
        results.push('PASS same-step old-age death cancels queued attack once; native pending-heir restart and daughter choice preserve every stable ID');
        for(const enabled of [false,true]) {
            await restore(fixture.raw);await page.evaluate(enabled=>FlatlandDebug.renewal(enabled),enabled);await stage(fixture.target);await invite(fixture.target);await page.keyboard.press('KeyJ');await advance(.1);await page.keyboard.press('KeyP');await page.locator('#saveBtn').click();
            const policy=await payload();assert.equal(policy.renewal.enabled,enabled);await restart(policy);assert.equal(await spar(),null);
        }
        await restore(fs.readFileSync('tools/fixtures/parenthood-v4.json','utf8'));assert.equal((await payload()).renewal.enabled,false);const legacy=await payload();
        await page.locator('#saveBtn').click();await restart(legacy);
        results.push('PASS renewal-enabled and disabled live spars restart exactly; frozen legacy v4 remains founding-only and round-trips to v5');
        assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'sparring-persistence-results.json'),JSON.stringify({results,errors},null,2));console.log(results.join('\n'));
    } finally {if(context)await context.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
