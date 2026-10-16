// Actual Pause/Family policy and year buttons, isolated native persistence.
// Needs/refuge placement and the simulation clock are controlled, not human play.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const {chromium}=process.env.FLATLAND_NODE_MODULES?createRequire(path.join(process.env.FLATLAND_NODE_MODULES,'_resolve.cjs'))('playwright'):require('playwright');
const output=path.resolve('output/playwright');fs.mkdirSync(output,{recursive:true});
const profile=fs.mkdtempSync(path.join(output,'renewal-profile-'));
(async()=>{
    const server=require('node:http').createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(fs.readFileSync('the-flatland.html'));});
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const url=`http://127.0.0.1:${server.address().port}/?debug=1`,errors=[],results=[];let context,page;
    const open=async()=>{
        context=await chromium.launchPersistentContext(profile,{headless:true,executablePath:process.env.FLATLAND_CHROMIUM||undefined,viewport:{width:1280,height:800},hasTouch:true});
        page=context.pages()[0];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());await page.goto(url);
    };
    const payload=()=>page.evaluate(()=>JSON.parse(FlatlandDebug.exportSave()).payload);
    try {
        await open();const legacy=fs.readFileSync('tools/fixtures/parenthood-v4.json','utf8');
        await page.evaluate(raw=>localStorage.setItem('flatland.manual.v1',raw),legacy);await page.reload();await page.locator('#continueBtn').click();await page.evaluate(()=>FlatlandDebug.manual());
        assert.equal((await payload()).renewal.enabled,false);
        await page.getByText('Population & families',{exact:true}).click();await page.locator('#renewalToggleBtn').click();
        assert.equal((await payload()).renewal.enabled,true);assert.equal(await page.evaluate(()=>localStorage.getItem('flatland.manual.v1')),legacy);
        assert.equal(JSON.parse(await page.evaluate(()=>localStorage.getItem('flatland.auto.v1'))).version,5);
        results.push('PASS legacy Continue remains disabled; explicit Pause opt-in writes v5 auto and preserves the v4 manual slot');
        await page.evaluate(()=>{FlatlandDebug.start('renewal-study-0');FlatlandDebug.manual();});
        const initial=await payload();assert.equal(initial.renewal.enabled,true);
        await page.evaluate(()=>FlatlandDebug.advance(119));assert.equal(Object.keys((await payload()).renewal.pairs).length,0);
        await page.evaluate(()=>FlatlandDebug.advance(1));assert.equal(Object.keys((await payload()).renewal.pairs).length,1);
        await page.evaluate(()=>FlatlandDebug.vitals({health:100,hunger:100,thirst:100}));
        await page.keyboard.press('KeyP');await page.locator('#pauseFamilyBtn').click();
        await page.locator('#advance5Btn').click();const after=await payload();assert.equal(after.family.births.length,1);
        const born=after.family.births[0];assert.ok(born.childIds.every(id=>!after.characters.find(c=>c.id===id).playerKnowledge.discoveredFacts.name));
        const view=await page.evaluate(()=>FlatlandDebug.familyView());assert.ok(born.childIds.every(id=>!view.members.some(m=>m.id===id)));
        assert.equal(after.family.rngState,initial.family.rngState);assert.equal(after.social.rngState,initial.social.rngState);
        results.push('PASS new expeditions enable renewal; actual Family year buttons produce the first private NPC cohort in year 6');
        const beforeInspector=await payload();await page.keyboard.press('F8');await page.evaluate(()=>FlatlandDebug.advance(120));await page.keyboard.press('Escape');
        assert.deepEqual(await payload(),beforeInspector);results.push('PASS F8 pauses renewal and retains exact policy, cursor, RNG, knowledge and full records');
        await page.locator('#familySaveBtn').click();const saved=await payload();await context.close();context=null;await open();await page.locator('#continueBtn').click();await page.evaluate(()=>FlatlandDebug.manual());
        assert.deepEqual(await payload(),saved);results.push('PASS enabled v5 household/birth/archive state survives full browser shutdown and native Continue exactly');
        await page.getByText('Population & families',{exact:true}).click();await page.locator('#renewalToggleBtn').click();const off=await payload();assert.equal(off.renewal.enabled,false);
        await page.locator('#pauseFamilyBtn').click();await page.locator('#advance5Btn').click();const later=await payload();
        assert.equal(later.family.births.length,off.family.births.length);assert.equal(later.romance.marriages.length,off.romance.marriages.length);
        assert.equal(later.renewal.matchingRngState,off.renewal.matchingRngState);assert.equal(later.renewal.birthRngState,off.renewal.birthRngState);
        await page.locator('#closeFamilyBtn').click();await page.locator('#renewalToggleBtn').click();assert.equal((await payload()).renewal.processedYear,11);
        assert.equal((await payload()).family.births.length,off.family.births.length);
        results.push('PASS disabling preserves families without new events; re-enable starts at the current year with no historical catch-up');
        for(const [width,height] of [[1280,800],[390,844],[844,390]]) {
            await page.setViewportSize({width,height});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
            await page.locator('#renewalToggleBtn').scrollIntoViewIfNeeded();
            if(width===390) {await page.locator('#renewalToggleBtn').tap();assert.equal((await payload()).renewal.enabled,false);await page.locator('#renewalToggleBtn').tap();assert.equal((await payload()).renewal.enabled,true);}
            await page.screenshot({path:path.join(output,`renewal-${width}x${height}.png`)});
        }
        assert.deepEqual(errors,[]);results.push('PASS policy controls fit desktop, portrait and short landscape, including emulated touch toggles; no page exceptions');
        fs.writeFileSync(path.join(output,'renewal-results.json'),JSON.stringify({results,errors,browser:context.browser().version()},null,2));console.log(results.join('\n'));
    } finally {if(context)await context.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
