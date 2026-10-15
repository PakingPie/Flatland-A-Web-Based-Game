// Controlled existing-marriage scenario; actual UI conversations and births.
// Setup supplies an isolated legacy-shaped marriage, not a normal player save.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const {chromium}=process.env.FLATLAND_NODE_MODULES?createRequire(path.join(process.env.FLATLAND_NODE_MODULES,'_resolve.cjs'))('playwright'):require('playwright');
const output=path.resolve('output/playwright');fs.mkdirSync(output,{recursive:true});
(async()=>{
    const server=require('node:http').createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(fs.readFileSync('the-flatland.html'));});
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    let browser;const errors=[],results=[];
    try {
        browser=await chromium.launch({headless:true,executablePath:process.env.FLATLAND_CHROMIUM||undefined});
        const context=await browser.newContext({viewport:{width:1280,height:800}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
        await page.goto(`http://127.0.0.1:${server.address().port}/?debug=1`);
        const id=await page.evaluate(()=>{
            FlatlandDebug.manual();let id;
            for(let seed=0;seed<40 && !id;seed++){FlatlandDebug.start(`hesitant-${seed}`);id=FlatlandDebug.courtshipCandidate('female','hesitant');}
            if(!id)throw Error('No hesitant fixture partner');
            const data=JSON.parse(FlatlandDebug.exportSave()),s=data.payload,a=s.characters[0],b=s.characters.find(c=>c.id===id),ids=[a.id,b.id].sort();
            b.x=b.px=a.x+40;b.y=b.py=a.y;
            b.playerKnowledge.relationship.trust=30;b.playerKnowledge.relationship.familiarity=50;
            b.playerKnowledge.discoveredFacts.name={value:b.actual.identity.name,kind:'confirmed',sourceId:'player',at:s.elapsed};
            a.actual.bonds={partnerIds:[b.id],marriageIds:['marriage-1']};b.actual.bonds={partnerIds:[a.id],marriageIds:['marriage-1']};
            s.romance={pairs:{[ids.join('|')]:{ids,affection:42,status:'married',knownBy:[],lastAt:-999,day:-1,today:0,topics:{},lastOutcome:'',lastBirthYear:-999}},marriages:[{id:'marriage-1',ids:[a.id,b.id],at:s.elapsed,endedAt:null,reason:null}]};
            const text=JSON.stringify(s);let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}data.checksum=h>>>0;
            const raw=JSON.stringify(data);localStorage.setItem('flatland.manual.v1',raw);if(!FlatlandDebug.importSave(raw))throw Error('Invalid marriage fixture');return id;
        });
        await page.reload();await page.locator('#continueBtn').click();await page.evaluate(()=>FlatlandDebug.manual());
        await page.locator('#pauseFamilyBtn').click();assert.match(await page.locator('#familyBirthStatus').innerText(),/unsure/);assert.equal(await page.locator('#familyBirthBtn').isDisabled(),true);
        const initial=await page.evaluate(id=>FlatlandDebug.parenthoodReadiness(id),id);assert.ok(initial.base<.3);assert.equal(initial.ready,false);
        results.push('PASS existing hesitant marriage loads and displays a specific actionable family status');
        await page.locator('#closeFamilyBtn').click();await page.locator('#resumeBtn').click();
        const meet=async()=>page.evaluate(id=>{
            FlatlandDebug.closeCitizen();const c=FlatlandDebug.snapshot().npcs.find(c=>c.id===id);
            for(let i=0;i<16;i++)try{FlatlandDebug.teleport(c.x+Math.cos(i*Math.PI/8)*48,c.y+Math.sin(i*Math.PI/8)*48);FlatlandDebug.openCitizen(id);return;}catch{}
            throw Error('No safe meeting position');
        },id);
        const choose=async topic=>{
            await meet();await page.locator('[data-group="romance"]').click();
            if(topic==='children') {await page.locator('[data-group="commitment"]').click();assert.ok(await page.locator('#bubbleOptions button').count()<=4);}
            await page.locator(`[data-romance="${topic}"]`).click();await page.evaluate(()=>FlatlandDebug.advance(4));
        };
        const nextYear=async()=>page.evaluate(id=>{
            FlatlandDebug.closeCitizen();FlatlandDebug.teleport(1728,1280);FlatlandDebug.vitals({health:100,hunger:100,thirst:100});FlatlandDebug.npcVitals(id,{health:100,hunger:100,thirst:100});
            const result=FlatlandDebug.advanceYears(1);if(!result.ok)throw Error(result.text);
        },id);
        await choose('children');assert.match(await page.locator('#dialogueText').innerText(),/unsure.*open to revisiting/);
        assert.equal(await page.locator('#socialOutcome').innerText(),'Family plans');assert.deepEqual(await page.evaluate(id=>FlatlandDebug.parenthoodReadiness(id),id),initial);
        results.push('PASS Discuss children gives a clear reply without adding affection, trust or willingness');
        let current=initial;
        for(let day=0;day<4 && !current.ready;day++) {
            await nextYear();
            for(const topic of ['compliment','outing','commitment']) await choose(topic);
            current=await page.evaluate(id=>FlatlandDebug.parenthoodReadiness(id),id);
        }
        assert.equal(current.ready,true);assert.equal(current.base,initial.base);assert.ok(current.willingness>initial.willingness);
        await nextYear();await choose('children');assert.match(await page.locator('#dialogueText').innerText(),/like us to have children/);
        await page.locator('#familyBtn').click();assert.equal(await page.locator('#familyBirthBtn').isEnabled(),true);await page.locator('#familyBirthBtn').click();
        const children=await page.evaluate(()=>JSON.parse(FlatlandDebug.exportSave()).payload.family.births[0].childIds);assert.ok(children.length>=2 && children.length<=4);
        await page.screenshot({path:path.join(output,'parenthood-family.png')});
        results.push('PASS varied relationship actions let the same spouse reconsider and produce a birth cohort through UI');
        assert.equal(await page.evaluate(()=>FlatlandDebug.save()),true);const saved=await page.evaluate(()=>JSON.parse(FlatlandDebug.exportSave()).payload);
        await page.reload();await page.locator('#continueBtn').click();await page.evaluate(()=>FlatlandDebug.manual());
        assert.deepEqual(await page.evaluate(()=>JSON.parse(FlatlandDebug.exportSave()).payload),saved);
        assert.equal((await page.evaluate(id=>FlatlandDebug.parenthoodReadiness(id),id)).base,initial.base);
        results.push('PASS native save/reload preserves the relationship, derived willingness and children without new save fields');
        assert.deepEqual(errors,[]);console.log(results.join('\n'));fs.writeFileSync(path.join(output,'parenthood-results.json'),JSON.stringify({results,errors,browser:browser.version()},null,2));
    }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
