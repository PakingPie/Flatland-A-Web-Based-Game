// Observe actual Canvas drawing and UI labels in an isolated restored family.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const {chromium}=process.env.FLATLAND_NODE_MODULES?createRequire(path.join(process.env.FLATLAND_NODE_MODULES,'_resolve.cjs'))('playwright'):require('playwright');
const out=path.resolve('output/playwright');fs.mkdirSync(out,{recursive:true});
(async()=>{
    const server=require('node:http').createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(fs.readFileSync('the-flatland.html'));});
    await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const errors=[],results=[];
    try {
        browser=await chromium.launch({headless:true,executablePath:process.env.FLATLAND_CHROMIUM||undefined});
        const context=await browser.newContext({viewport:{width:1280,height:800}}),page=await context.newPage();
        page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
        await page.addInitScript(()=>{
            window.goldMarks={world:[],minimap:[]};const proto=CanvasRenderingContext2D.prototype;
            const arc=proto.arc,stroke=proto.stroke,fill=proto.fill,rect=proto.fillRect;
            proto.arc=function(x,y,r,...rest){this.testArc={x,y,r};return arc.call(this,x,y,r,...rest);};
            proto.fillRect=function(x,y,w,h){if(x===0&&y===0&&window.goldMarks[this.canvas.id]) window.goldMarks[this.canvas.id]=[];return rect.call(this,x,y,w,h);};
            proto.stroke=function(...args){if(this.canvas.id==='world'&&this.strokeStyle==='#f1cd88') {const t=this.getTransform();window.goldMarks.world.push({x:t.e,y:t.f});}return stroke.apply(this,args);};
            proto.fill=function(...args){if(this.canvas.id==='minimap'&&this.fillStyle==='#f1cd88')window.goldMarks.minimap.push({...this.testArc});return fill.apply(this,args);};
        });
        await page.goto(`http://127.0.0.1:${server.address().port}/?debug=1`);
        await page.evaluate(raw=>localStorage.setItem('flatland.manual.v1',raw),fs.readFileSync('tools/fixtures/parenthood-v4.json','utf8'));
        await page.reload();await page.locator('#continueBtn').click();await page.evaluate(()=>FlatlandDebug.manual());await page.locator('#resumeBtn').click();
        const payload=()=>page.evaluate(()=>JSON.parse(FlatlandDebug.exportSave()).payload);
        const marks=()=>page.evaluate(async()=>{
            await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
            const s=FlatlandDebug.snapshot(),known=new Set(FlatlandDebug.familyView().members.filter(m=>m.alive&&m.id!==s.player.id).map(m=>m.id));
            return {map:goldMarks.minimap,world:goldMarks.world.map(p=>FlatlandDebug.screenToWorld(p.x/s.viewport.dpr,p.y/s.viewport.dpr)),expected:s.npcs.filter(c=>known.has(c.id)).map(c=>({id:c.id,x:c.x,y:c.y}))};
        });
        const before=await payload(),shown=await marks();assert.ok(shown.expected.length>0);assert.ok(shown.world.length>0);
        assert.deepEqual(shown.map.map(p=>[p.x,p.y]).sort(),shown.expected.map(p=>[p.x,p.y]).sort());
        assert.ok(shown.world.every(p=>shown.expected.some(c=>Math.hypot(c.x-p.x,c.y-p.y)<.01)));
        assert.deepEqual(await payload(),before);await page.screenshot({path:path.join(out,'family-halos-desktop.png')});
        results.push('PASS actual gold world halos and minimap dots mark living known family after daughter succession, excluding player, deceased and strangers; rendering is read-only');
        await page.keyboard.press('KeyP');await page.locator('#pauseFamilyBtn').click();
        assert.equal(await page.locator('#advance1Btn').innerText(),'Live 1 day');assert.equal(await page.locator('#advance5Btn').innerText(),'Live 5 days');
        assert.match(await page.locator('#familySummary').innerText(),/age \d+ days/);assert.ok(!/\byears?\b/i.test(await page.locator('#familyScreen').innerText()));
        const birth=before.family.births[0];assert.ok((await page.locator('#familyHistory').textContent()).includes(`Day ${Math.floor(birth.at/120)+1}`));
        await page.locator('#advance1Btn').click();const after=await payload();
        assert.equal(after.elapsed-before.elapsed,120);assert.equal(after.characters.find(c=>c.id===after.currentPlayerId).actual.life.ageYears,before.characters.find(c=>c.id===before.currentPlayerId).actual.life.ageYears+1);
        results.push('PASS day labels, explicit day ages and one-based history agree with the HUD; Live 1 day retains the existing 120-second aging interval');
        // Conceal a cohort's relationship provenance without changing identities.
        const hidden=JSON.parse(JSON.stringify(before));hidden.renewal.backgroundBirthIds=[birth.id];hidden.renewal.knownEvents={};
        await page.evaluate(s=>{const d=JSON.parse(FlatlandDebug.exportSave());d.payload=s;const text=JSON.stringify(s);let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}d.checksum=h>>>0;if(!FlatlandDebug.importSave(JSON.stringify(d)))throw Error('Concealed cohort fixture rejected');FlatlandDebug.manual();},hidden);
        await page.locator('#resumeBtn').click();const concealed=await marks();
        const siblings=birth.childIds.filter(id=>id!==hidden.currentPlayerId);assert.ok(siblings.length);
        assert.ok(siblings.every(id=>!concealed.expected.some(c=>c.id===id)));
        assert.deepEqual(concealed.map.map(p=>[p.x,p.y]).sort(),concealed.expected.map(p=>[p.x,p.y]).sort());
        results.push('PASS private biological relatives receive no gold marks when the observer lacks the household event');
        for(const [width,height] of [[390,844],[844,390]]) {await page.setViewportSize({width,height});await page.screenshot({path:path.join(out,`family-halos-${width}x${height}.png`)});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
        assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'family-presentation-results.json'),JSON.stringify({results,errors,browser:browser.version()},null,2));console.log(results.join('\n'));
    } finally {if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
