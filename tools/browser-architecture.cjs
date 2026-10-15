// Isolated native-storage regressions for the Phase 3.5 boundaries. Quota and
// denial are injected at the browser Storage API, not by saturating a real disk.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const {chromium}=process.env.FLATLAND_NODE_MODULES?createRequire(path.join(process.env.FLATLAND_NODE_MODULES,'_resolve.cjs'))('playwright'):require('playwright');
const output=path.resolve('output/playwright'); fs.mkdirSync(output,{recursive:true});
const profile=fs.mkdtempSync(path.join(output,'architecture-profile-'));
(async()=>{
    const server=require('node:http').createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(fs.readFileSync('the-flatland.html'));});
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const url=`http://127.0.0.1:${server.address().port}/the-flatland.html?debug=1`;
    const raw=fs.readFileSync('tools/fixtures/released-v4.json','utf8'), fixture=JSON.parse(raw);
    let context,page; const errors=[],results=[];
    const listen=p=>{p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());};
    const open=async()=>{
        context=await chromium.launchPersistentContext(profile,{headless:true,executablePath:process.env.FLATLAND_CHROMIUM||undefined,viewport:{width:1280,height:800}});
        page=context.pages()[0]; listen(page); await page.goto(url);
    };
    const payload=()=>page.evaluate(()=>JSON.parse(FlatlandDebug.exportSave()).payload);
    const slots=()=>page.evaluate(()=>['flatland.manual.v1','flatland.auto.v1'].map(key=>localStorage.getItem(key)));
    try {
        await open();
        await page.evaluate(raw=>localStorage.setItem('flatland.manual.v1',raw),raw); await page.reload();
        for(let cycle=0;cycle<3;cycle++) {
            await page.locator('#continueBtn').click(); await page.evaluate(()=>FlatlandDebug.manual());
            assert.deepEqual(await payload(),fixture.payload);
            assert.equal(await page.evaluate(()=>FlatlandDebug.save()),true);
            if(cycle<2) {await context.close();context=null;await open();}
        }
        results.push('PASS frozen released-v4 payload through three native Continue cycles and two full browser restarts');
        const snapshot=await page.evaluate(()=>FlatlandDebug.snapshot());
        const dead=fixture.payload.characters.filter(c=>!c.actual.life.alive).map(c=>c.id);
        assert.ok(dead.length>0); assert.ok(snapshot.npcs.every(c=>c.actual.life.alive && !dead.includes(c.id)));
        assert.equal((await payload()).characters.length,fixture.payload.characters.length);
        await page.locator('#pauseFamilyBtn').click();
        assert.equal(await page.locator('[data-member-id="founder-000"]').count(),1);
        results.push('PASS deceased ancestors remain in family/save records and leave the living world projection');
        await page.evaluate(()=>{
            window.testFamilyRow=document.querySelector('[data-member-id="founder-000"]');
            testFamilyRow.querySelector('details').open=true;
        });
        await page.locator('#advance1Btn').click();
        assert.equal(await page.evaluate(()=>testFamilyRow===document.querySelector('[data-member-id="founder-000"]') && testFamilyRow.querySelector('details').open),true);
        await page.screenshot({path:path.join(output,'architecture-family.png')});
        results.push('PASS keyed family rows retain their DOM identity and expanded details while family years advance');
        const before=await payload(), stored=await slots();
        const invalid=JSON.parse(raw); invalid.payload.characters[0].actual.bonds.partnerIds=['founder-000'];
        const text=JSON.stringify(invalid.payload);let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}invalid.checksum=h>>>0;
        assert.equal(await page.evaluate(raw=>FlatlandDebug.importSave(raw),JSON.stringify(invalid)),false);
        assert.deepEqual(await payload(),before);assert.deepEqual(await slots(),stored);
        results.push('PASS malformed spouse bonds reject the candidate without changing active progress or native slots');
        const failure=await page.evaluate(()=>{
            const set=Storage.prototype.setItem, get=Storage.prototype.getItem;
            try {
                Storage.prototype.setItem=function(){throw new DOMException('Injected quota','QuotaExceededError');};
                const quota=FlatlandDebug.save(), quotaError=FlatlandDebug.saveStatus().error;
                Storage.prototype.setItem=set;
                Storage.prototype.getItem=function(){throw new DOMException('Injected denial','SecurityError');};
                const denied=FlatlandDebug.save(), deniedError=FlatlandDebug.saveStatus().error;
                return {quota,quotaError,denied,deniedError};
            } finally {Storage.prototype.setItem=set;Storage.prototype.getItem=get;}
        });
        assert.equal(failure.quota,false);assert.match(failure.quotaError,/full/);
        assert.equal(failure.denied,false);assert.match(failure.deniedError,/denial/);
        assert.deepEqual(await payload(),before);assert.deepEqual(await slots(),stored);
        assert.match(await page.locator('#pauseBtn').getAttribute('title'),/Save failed/);
        results.push('PASS injected browser quota and storage denial display errors and preserve existing slots/progress');
        const deniedPage=await context.newPage();listen(deniedPage);
        await deniedPage.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Injected startup denial','SecurityError');}}));
        await deniedPage.goto(url);await deniedPage.locator('#startBtn').click();
        await deniedPage.evaluate(()=>FlatlandDebug.manual());
        assert.equal(await deniedPage.evaluate(()=>FlatlandDebug.save()),false);
        assert.equal(await deniedPage.locator('#hud').isVisible(),true);
        assert.equal(await deniedPage.evaluate(()=>FlatlandDebug.snapshot().state),'running');
        await deniedPage.close();assert.deepEqual(await slots(),stored);
        results.push('PASS denied storage during startup still permits a new playable expedition');
        await page.locator('#closeFamilyBtn').click(); await page.locator('#resumeBtn').click();
        const other=await context.newPage();listen(other);await other.goto(url);
        const changed=JSON.stringify({...fixture,savedAt:Date.now()+1000});
        await other.evaluate(raw=>localStorage.setItem('flatland.manual.v1',raw),changed);
        await page.waitForFunction(()=>FlatlandDebug.saveStatus().error.includes('Another tab'));
        assert.equal(await page.evaluate(()=>FlatlandDebug.save()),false);
        assert.equal(await page.evaluate(()=>FlatlandDebug.snapshot().state),'paused');
        assert.equal((await slots())[0],changed);
        results.push('PASS native cross-tab storage event blocks saving and preserves the other tab’s slot');
        assert.deepEqual(errors,[]);
        console.log(results.join('\n'));
        fs.writeFileSync(path.join(output,'architecture-results.json'),JSON.stringify({results,errors,browser:context.browser().version()},null,2));
    } finally {if(context)await context.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
