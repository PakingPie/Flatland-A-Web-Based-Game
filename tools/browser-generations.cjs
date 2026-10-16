// Real DOM/Canvas/native-storage integration. QA hooks only control the clock,
// proximity and needs, and locate consenting candidates; social gains, births,
// aging and control transfer run through actual game rules and UI actions.
const fs=require('node:fs'), path=require('node:path'), assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const {chromium}=process.env.FLATLAND_NODE_MODULES ? createRequire(path.join(process.env.FLATLAND_NODE_MODULES,'_resolve.cjs'))('playwright') : require('playwright');
const output=path.resolve('output/playwright');fs.mkdirSync(output,{recursive:true});
const profile=fs.mkdtempSync(path.join(output,'generation-profile-'));
(async()=>{
    const server=require('node:http').createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(fs.readFileSync('the-flatland.html'));});
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const url=`http://127.0.0.1:${server.address().port}/the-flatland.html?debug=1`;
    let context,page,speakingId;const errors=[],results=[];
    const open=async()=>{
        context=await chromium.launchPersistentContext(profile,{headless:true,executablePath:process.env.FLATLAND_CHROMIUM||undefined,viewport:{width:1440,height:900}});
        page=context.pages()[0];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
        await page.goto(url);await page.waitForFunction(()=>!!window.FlatlandDebug);
    };
    const snapshot=()=>page.evaluate(()=>FlatlandDebug.snapshot());
    const meet=async id=>{
        speakingId=id;
        await page.evaluate(id=>{
            const s=FlatlandDebug.snapshot(),c=s.npcs.find(c=>c.id===id);
            let found=false;for(let i=0;i<16;i++) { try { FlatlandDebug.teleport(c.x+Math.cos(i*Math.PI/8)*48,c.y+Math.sin(i*Math.PI/8)*48);found=true;break; } catch{} }
            if(!found) throw Error('No safe meeting position');
            FlatlandDebug.vitals({health:100,hunger:100,thirst:100});FlatlandDebug.npcVitals(id,{health:100,hunger:100,thirst:100});FlatlandDebug.openCitizen(id);
        },id);
    };
    const nextYear=async id=>{
        await page.evaluate(()=>{FlatlandDebug.closeCitizen();FlatlandDebug.teleport(1728,1280);FlatlandDebug.vitals({health:100,hunger:100,thirst:100});const r=FlatlandDebug.advanceYears(1);if(!r.ok)throw Error(r.text);});
        await meet(id);
    };
    const reply=async(selector)=>{
        await page.evaluate(id=>FlatlandDebug.openCitizen(id),speakingId);
        const social=selector.match(/data-topic="([^"]+)/),romance=selector.match(/data-romance="([^"]+)/);
        if(social && social[1]!=='introduce') { await page.locator('[data-group="talk"]').click(); if(!['chat','interests'].includes(social[1])) await page.locator('[data-group="stories"]').click(); }
        if(romance) { await page.locator('[data-group="romance"]').click(); if(['preferences','propose','separate'].includes(romance[1])) await page.locator('[data-group="commitment"]').click(); }
        const b=page.locator(selector);if(await b.isEnabled()){await b.click();await page.evaluate(()=>FlatlandDebug.advance(4));return true;} return false;
    };
    const court=async sex=>{
        const id=await page.evaluate(sex=>FlatlandDebug.courtshipCandidate(sex),sex);assert.ok(id,`compatible ${sex} adult exists`);await meet(id);
        for(let day=0;day<12;day++) {
            if(day) await nextYear(id);
            const v=await page.evaluate(id=>FlatlandDebug.socialView(id),id);
            if(!v.introduced) await reply('[data-topic="introduce"]');
            const before=await snapshot(); const pair=JSON.parse(await page.evaluate(()=>FlatlandDebug.exportSave())).payload.romance.pairs;
            const current=Object.values(pair).find(p=>p.ids.includes(id)&&p.ids.includes(before.player.id));
            if(current?.affection>=42 && (await page.evaluate(id=>FlatlandDebug.socialView(id),id)).relationship.trust>=18) {
                await reply('[data-romance="propose"]');
                if((await snapshot()).player.actual.bonds.partnerIds.includes(id)) return id;
            }
            for(const topic of ['chat','occupation','district']) await reply(`[data-topic="${topic}"]`);
            for(const topic of ['compliment','outing','commitment']) await reply(`[data-romance="${topic}"]`);
        }
        throw Error('Courtship did not reach marriage within twelve family years');
    };
    try {
        await open();await page.locator('#seedInput').fill('family');await page.locator('#startBtn').click();await page.evaluate(()=>{FlatlandDebug.manual();FlatlandDebug.renewal(false);});
        const initial=await snapshot();assert.equal(initial.player.body.visibleType,'Irregular triangle');
        const spouse=await court('female');
        await reply('[data-romance="preferences"]');
        await page.screenshot({path:path.join(output,'courtship.png')});
        await page.evaluate(()=>FlatlandDebug.closeCitizen());await page.locator('#familyBtn').click();await page.locator('#familyBirthBtn').click();await page.locator('#closeFamilyBtn').click();
        let s=await snapshot(), children=s.player.actual.lineage.childrenIds;assert.ok(children.length>=2);
        assert.equal(new Set(children.map(id=>JSON.stringify(s.npcs.find(c=>c.id===id).actual.genome))).size,children.length);
        await page.evaluate(()=>{FlatlandDebug.closeCitizen();FlatlandDebug.teleport(1728,1280);FlatlandDebug.vitals({health:100,hunger:100,thirst:100});});
        await page.locator('#familyBtn').click();assert.ok((await page.locator('#familyMembers').innerText()).includes('Generation 2'));
        for(let i=0;i<4;i++) await page.locator('#advance5Btn').click();
        await page.screenshot({path:path.join(output,'family-register.png')});
        const v=await page.evaluate(()=>FlatlandDebug.familyView());
        const daughter=v.members.find(m=>children.includes(m.id)&&m.sex==='female');assert.ok(daughter?.eligible);
        for(const summary of await page.locator('#familyMembers summary').all()) await summary.click();
        const privacy=await page.locator('#familyMembers').innerText();assert.ok(privacy.includes('Latent geometry remains undiscovered'));assert.ok(!privacy.includes('latentIrregularAncestry'));
        const beforeSuccession=await page.evaluate(()=>FlatlandDebug.exportSave());
        await page.locator(`[data-successor="${daughter.id}"]`).click();
        s=await snapshot();assert.equal(s.state,'paused');assert.equal(s.player.id,daughter.id);assert.equal(s.player.actual.lineage.generation,2);assert.equal(s.seed,initial.seed);
        assert.equal(s.npcs.find(c=>c.id===children.find(id=>id!==daughter.id)).isPlayer,false);assert.ok(s.npcs.find(c=>c.id===initial.player.id));
        await page.locator('#saveBtn').click();
        let saved=JSON.parse(await page.evaluate(()=>FlatlandDebug.exportSave())).payload;
        await context.close();context=null;await open();await page.locator('#continueBtn').click();await page.evaluate(()=>{FlatlandDebug.manual();FlatlandDebug.renewal(false);});
        assert.deepEqual(JSON.parse(await page.evaluate(()=>FlatlandDebug.exportSave())).payload,saved);
        results.push('PASS irregular founder → real courtship → marriage → cohort → family register → adult daughter → Generation 2 → native browser shutdown/reopen');
        await page.locator('#resumeBtn').click();
        const oldPosition=(await snapshot()).player;
        await page.keyboard.down('KeyD');await page.evaluate(()=>FlatlandDebug.advance(1));await page.keyboard.up('KeyD');
        s=await snapshot();assert.ok(s.player.x>oldPosition.x);assert.equal(s.state,'running');
        results.push('PASS daughter movement/survival continues in the original world');
        // A further ordinary UI courtship proves that the female heir can bear children.
        const male=await court('male');await page.evaluate(()=>FlatlandDebug.vitals({health:100,hunger:100,thirst:100}));await page.evaluate(()=>FlatlandDebug.closeCitizen());await page.locator('#familyBtn').click();await page.locator('#familyBirthBtn').click();await page.locator('#closeFamilyBtn').click();
        s=await snapshot();assert.ok(s.player.actual.lineage.childrenIds.length>=2);
        for(const id of s.player.actual.lineage.childrenIds) { const c=s.npcs.find(c=>c.id===id);assert.equal(c.actual.lineage.motherId,daughter.id);assert.equal(c.actual.lineage.fatherId,male);assert.equal(c.actual.lineage.generation,3); }
        results.push('PASS female Generation 2 player courts a male and bears Generation 3');
        await page.evaluate(()=>FlatlandDebug.closeCitizen());await page.locator('#familyBtn').click();
        await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(output,'family-mobile.png')});
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
        await page.locator('#closeFamilyBtn').click();await page.locator('#pauseBtn').click();await page.locator('#saveBtn').click();
        saved=JSON.parse(await page.evaluate(()=>FlatlandDebug.exportSave())).payload;
        await context.close();context=null;await open();await page.locator('#continueBtn').click();await page.evaluate(()=>{FlatlandDebug.manual();FlatlandDebug.renewal(false);});assert.deepEqual(JSON.parse(await page.evaluate(()=>FlatlandDebug.exportSave())).payload,saved);
        results.push('PASS second native browser close/reopen retains Generation 2 player and Generation 3 family');
        await page.screenshot({path:path.join(output,'generation-2-restored.png')});
        const downloadPromise=page.waitForEvent('download');await page.locator('#exportSaveBtn').click();const download=await downloadPromise;
        const exportPath=path.join(output,'exported-dynasty.json');await download.saveAs(exportPath);
        const preImport=JSON.parse(await page.evaluate(()=>FlatlandDebug.exportSave())).payload;
        const slots=await page.evaluate(()=>[localStorage.getItem('flatland.manual.v1'),localStorage.getItem('flatland.auto.v1')]);
        await page.locator('#saveFileInput').setInputFiles({name:'broken.json',mimeType:'application/json',buffer:Buffer.from('{bad')});
        await page.waitForFunction(()=>document.querySelector('#pauseScreen [data-save-status]').textContent.includes('Import failed'));
        assert.deepEqual(JSON.parse(await page.evaluate(()=>FlatlandDebug.exportSave())).payload,preImport);
        await page.locator('#saveFileInput').setInputFiles(exportPath);
        await page.waitForFunction(()=>document.querySelector('#pauseScreen [data-save-status]').textContent.includes('Imported and paused'));
        assert.deepEqual(JSON.parse(await page.evaluate(()=>FlatlandDebug.exportSave())).payload,preImport);
        assert.deepEqual(await page.evaluate(()=>[localStorage.getItem('flatland.manual.v1'),localStorage.getItem('flatland.auto.v1')]),slots);
        results.push('PASS native file export/import and transactional malformed-file rejection preserve browser slots');
        await page.evaluate(()=>{FlatlandDebug.start('family');FlatlandDebug.manual();FlatlandDebug.renewal(false);});
        await court('male');await page.evaluate(()=>FlatlandDebug.closeCitizen());await page.locator('#familyBtn').click();
        assert.equal(await page.locator('#familyBirthBtn').isDisabled(),true);assert.ok((await page.locator('#familyBirthStatus').innerText()).includes('Joint births'));
        assert.equal((await snapshot()).player.actual.lineage.childrenIds.length,0);
        await page.screenshot({path:path.join(output,'same-sex-household.png')});
        await page.locator('#closeFamilyBtn').click();await page.evaluate(()=>{FlatlandDebug.vitals({health:0});FlatlandDebug.advance(.1);});
        assert.equal((await snapshot()).state,'dead');assert.ok((await page.locator('#deathStats').innerText()).includes('Dynasty:'));
        results.push('PASS same-sex UI marriage/household, no joint biological births, and lineage extinction');
        assert.equal(await page.evaluate(raw=>FlatlandDebug.importSave(raw),beforeSuccession),true);
        await page.locator('#resumeBtn').click();await page.evaluate(()=>{FlatlandDebug.vitals({health:0});FlatlandDebug.advance(.1);});
        assert.equal((await snapshot()).state,'family');assert.equal(await page.locator('#closeFamilyBtn').isDisabled(),true);
        assert.equal(await page.evaluate(()=>FlatlandDebug.save()),true);
        const pendingDeath=JSON.parse(await page.evaluate(()=>FlatlandDebug.exportSave())).payload;
        await context.close();context=null;await open();await page.locator('#continueBtn').click();await page.evaluate(()=>{FlatlandDebug.manual();FlatlandDebug.renewal(false);});
        assert.equal((await snapshot()).state,'family');assert.deepEqual(JSON.parse(await page.evaluate(()=>FlatlandDebug.exportSave())).payload,pendingDeath);
        await page.locator(`[data-successor="${daughter.id}"]`).click();assert.equal((await snapshot()).player.id,daughter.id);
        results.push('PASS death with adult heirs survives shutdown/reopen while awaiting successor selection');
        assert.deepEqual(errors,[]);results.push('PASS no page errors');
        console.log(results.join('\n'));fs.writeFileSync(path.join(output,'generation-results.json'),JSON.stringify({results,errors,browser:context.browser()?.version()},null,2));
    } finally {if(context)await context.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
