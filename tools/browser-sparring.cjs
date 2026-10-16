// Isolated, controlled setup; invitations, walking, keys, UI and persistence are real.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const {chromium}=process.env.FLATLAND_NODE_MODULES?createRequire(path.join(process.env.FLATLAND_NODE_MODULES,'_resolve.cjs'))('playwright'):require('playwright');
const out=path.resolve('output/playwright');fs.mkdirSync(out,{recursive:true});
(async()=>{
    const server=require('node:http').createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(fs.readFileSync('the-flatland.html'));});
    await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const errors=[],results=[];
    try {
        browser=await chromium.launch({headless:true,executablePath:process.env.FLATLAND_CHROMIUM||undefined});
        const context=await browser.newContext({viewport:{width:1280,height:800},hasTouch:true}),page=await context.newPage();
        page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
        const url=`http://127.0.0.1:${server.address().port}/?debug=1`;await page.goto(url);
        const snap=()=>page.evaluate(()=>FlatlandDebug.snapshot());
        const spar=()=>page.evaluate(()=>FlatlandDebug.sparring());
        const payload=()=>page.evaluate(()=>JSON.parse(FlatlandDebug.exportSave()).payload);
        const advance=n=>page.evaluate(n=>FlatlandDebug.advance(n),n);
        const restore=async raw=>{assert.deepEqual(await page.evaluate(raw=>FlatlandDebug.validateSave(raw),raw),[]);assert.equal(await page.evaluate(raw=>FlatlandDebug.importSave(raw),raw),true);await page.evaluate(()=>FlatlandDebug.manual());await page.locator('#resumeBtn').click();};
        // Change only test-owned snapshots, recompute the existing envelope checksum.
        const edit=async changes=>{
            const raw=await page.evaluate(changes=>{
                const d=JSON.parse(FlatlandDebug.exportSave()),s=d.payload;
                for(const {id,fields} of changes) Object.assign(s.characters.find(c=>c.id===id),fields);
                let h=2166136261;for(const ch of JSON.stringify(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}d.checksum=h>>>0;return JSON.stringify(d);
            },changes);await restore(raw);
        };
        await page.evaluate(()=>{FlatlandDebug.start('sparring-qa');FlatlandDebug.manual();FlatlandDebug.renewal(false);});
        const target=(await snap()).npcs.find(c=>c.actual.identity.sex==='male').id;
        const base=await snap(),p=base.player,c=base.npcs.find(c=>c.id===target);
        await edit([{id:p.id,fields:{x:1928,px:1928,y:1152,py:1152,angle:0,prevAngle:0}},
            {id:target,fields:{x:1968,px:1968,y:1152,py:1152,angle:Math.PI,prevAngle:Math.PI,vitals:{health:100,hunger:100,thirst:100,stamina:100},ai:{...c.ai,path:[],pathIndex:0,wait:90,think:90,activity:'idle'}}}]);
        await page.evaluate(id=>FlatlandDebug.openCitizen(id),target);await page.locator('[data-topic="introduce"]').click();await advance(.1);
        assert.equal(await page.evaluate(id=>FlatlandDebug.socialView(id).introduced,target),true);
        await page.evaluate(()=>FlatlandDebug.teleport(1728,1152));
        const ready=await page.evaluate(()=>FlatlandDebug.exportSave());
        const invite=async()=>{await page.evaluate(id=>FlatlandDebug.openCitizen(id),target);await page.locator('[data-group="talk"]').click();assert.equal(await page.locator('#bubbleOptions button').count(),4);await page.getByRole('button',{name:'Invite to spar',exact:true}).click();};
        const start=async()=>{await invite();for(let i=0;i<100 && !await spar();i++)await advance(.1);assert.ok(await spar());};
        await invite();await advance(.2);assert.equal(await spar(),null);assert.ok((await snap()).player.x>1728);
        await page.keyboard.press('Escape');await advance(1);assert.equal(await spar(),null);
        await restore(ready);await start();
        assert.ok((await snap()).player.x>1728+100);assert.equal((await snap()).npcs.find(c=>c.id===target).vitals.health,100);
        results.push('PASS introduced adult invitation walks before acceptance; Escape cancels without damage; no approach strike');
        // Let the opponent close to striking range. Player turns toward them by movement.
        await advance(1.1);await page.keyboard.down('KeyD');await advance(.05);await page.keyboard.up('KeyD');
        const before=(await snap()).npcs.find(c=>c.id===target).vitals.health;
        await page.keyboard.press('KeyJ');await advance(.35);
        assert.ok((await snap()).npcs.find(c=>c.id===target).vitals.health<before);
        const afterHit=(await snap()).npcs.find(c=>c.id===target).vitals.health;await advance(.4);assert.equal((await snap()).npcs.find(c=>c.id===target).vitals.health,afterHit);
        await page.keyboard.down('KeyK');const h=(await snap()).player.vitals.health;await advance(2);await page.keyboard.up('KeyK');
        assert.ok((await snap()).player.vitals.health>=h-6.4-.001);assert.ok((await snap()).player.vitals.health<h);
        results.push('PASS J single strike, fixed recovery and K frontal defense run through actual encounter and opponent AI');
        // Every menu freezes both the saved world and transient timers exactly.
        for(const mode of ['bubble','pause','help','family','inspect']) {
            if(mode==='bubble')await page.evaluate(id=>FlatlandDebug.openCitizen(id),target);
            if(mode==='pause')await page.keyboard.press('KeyP');
            if(mode==='help')await page.keyboard.press('KeyH');
            if(mode==='family')await page.locator('#familyBtn').click();
            if(mode==='inspect')await page.keyboard.press('F8');
            const a=await spar(),s=await payload();await page.keyboard.press('KeyJ');await advance(2);assert.deepEqual(await spar(),a);assert.deepEqual(await payload(),s);
            if(mode==='bubble')await page.keyboard.press('Escape');
            if(mode==='pause')await page.locator('#resumeBtn').click();
            if(mode==='help')await page.locator('#closeHelpBtn').click();
            if(mode==='family') {assert.equal(await page.locator('#advance1Btn').isDisabled(),true);await page.locator('#closeFamilyBtn').click();}
            if(mode==='inspect')await page.keyboard.press('F8');
            assert.equal((await spar()).swings[p.id].phase,a.swings[p.id].phase);
        }
        await page.keyboard.down('KeyK');await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal((await snap()).state,'paused');assert.deepEqual((await snap()).keys,[]);assert.equal((await snap()).holds.defend,false);await page.keyboard.up('KeyK');await page.locator('#resumeBtn').click();
        results.push('PASS bubbles, Pause, Help, Family and F8 freeze world/timers and reject buffered strikes; blur clears holds; days require ending spar');
        for(const [width,height] of [[1280,800],[390,844],[844,390]]) {
            await page.setViewportSize({width,height});
            const fit=await page.locator('#sparPanel').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight;});assert.equal(fit,true);
            await page.screenshot({path:path.join(out,`sparring-${width}x${height}.png`)});
        }
        await page.locator('#endSparBtn').tap();assert.equal(await spar(),null);
        await page.setViewportSize({width:1280,height:800});await restore(ready);await start();
        await page.locator('#strikeBtn').tap();await advance(.1);assert.equal((await spar()).swings[p.id].phase,'windup');
        const guard=await page.locator('#defendBtn').boundingBox();await page.touchscreen.tap(guard.x+guard.width/2,guard.y+guard.height/2);
        // Keyboard activation toggles hold for switch/keyboard access; native touch holds release.
        assert.equal((await snap()).holds.defend,false);
        const cdp=await context.newCDPSession(page);
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:guard.x+guard.width/2,y:guard.y+guard.height/2}]});
        assert.equal((await snap()).holds.defend,true);await advance(.8);
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal((await snap()).holds.defend,false);await cdp.detach();
        await page.keyboard.down('ShiftLeft');await page.keyboard.down('KeyA');await advance(3);await page.keyboard.up('KeyA');await page.keyboard.up('ShiftLeft');assert.equal(await spar(),null);
        results.push('PASS desktop/portrait/landscape controls fit; native touch strike/end and released guard; sustained sprint retreat ends practice');
        await restore(ready);await start();await page.evaluate(()=>FlatlandDebug.vitals({stamina:.05}));await page.keyboard.down('KeyK');await advance(.1);await page.keyboard.up('KeyK');assert.equal(await spar(),null);
        await page.evaluate(()=>{FlatlandDebug.teleport(1728,1280);FlatlandDebug.vitals({health:40,hunger:80,thirst:80});});await page.keyboard.press('Space');await advance(2);assert.ok((await snap()).player.vitals.health>43);
        await restore(ready);await page.evaluate(id=>FlatlandDebug.npcVitals(id,{health:34}),target);await invite();await advance(3);assert.equal(await spar(),null);assert.match(await page.locator('#dialogueText').innerText(),/health/);
        results.push('PASS stamina exhaustion ends practice, supplied refuge heals retained health, low-health invitation refuses');
        assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'sparring-results.json'),JSON.stringify({results,errors,browser:browser.version()},null,2));console.log(results.join('\n'));
    } finally {if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
