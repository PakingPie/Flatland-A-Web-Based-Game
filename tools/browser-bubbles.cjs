// Real desktop/touch UI checks for compact choices, paused reading and queued approach.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const {chromium}=process.env.FLATLAND_NODE_MODULES?createRequire(path.join(process.env.FLATLAND_NODE_MODULES,'_resolve.cjs'))('playwright'):require('playwright');
const out=path.resolve('output/playwright');fs.mkdirSync(out,{recursive:true});
(async()=>{
    const server=require('node:http').createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(fs.readFileSync('the-flatland.html'));});
    await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const errors=[],results=[];
    try{
        browser=await chromium.launch({headless:true,executablePath:process.env.FLATLAND_CHROMIUM||undefined});
        const context=await browser.newContext({viewport:{width:1280,height:800}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
        const url=`http://127.0.0.1:${server.address().port}/?debug=1`;await page.goto(url);
        assert.ok((await page.locator('#startScreen').innerText()).split(/\s+/).length<65);
        await page.locator('#startBtn').click();await page.evaluate(()=>FlatlandDebug.manual());
        const id='citizen-001';
        await page.evaluate(id=>FlatlandDebug.openCitizen(id),id);
        const before=await page.evaluate(()=>FlatlandDebug.snapshot());await page.evaluate(()=>FlatlandDebug.advance(5));
        const after=await page.evaluate(()=>FlatlandDebug.snapshot());assert.equal(after.time,before.time);assert.deepEqual(after.player.vitals,before.player.vitals);assert.deepEqual(after.npcs,before.npcs);
        assert.ok(await page.locator('#bubbleOptions button').count()<=4);assert.equal(await page.locator('#bubbleDetails').isVisible(),false);
        await page.screenshot({path:path.join(out,'bubble-stranger-desktop.png')});
        await page.locator('[data-topic="introduce"]').click();
        let s=await page.evaluate(()=>FlatlandDebug.snapshot());assert.equal(s.npcs[0].playerKnowledge.relationship.familiarity,0);
        await page.evaluate(()=>FlatlandDebug.advance(3));s=await page.evaluate(()=>FlatlandDebug.snapshot());assert.ok(s.player.y<before.player.y-70);assert.ok(s.npcs[0].playerKnowledge.relationship.lastAt>=0);assert.equal(await page.locator('#citizenPanel').isVisible(),false);assert.equal(await page.locator('#speechBubble').isVisible(),true);assert.ok((await page.locator('#dialogueText').innerText()).length<=112);
        results.push('PASS brief tutorial, paused choices, automatic approach, real greeting and short reply');
        await page.evaluate(id=>FlatlandDebug.openCitizen(id),id);
        await page.locator('[data-group="details"]').click();assert.equal(await page.locator('#bubbleDetails').isVisible(),true);assert.ok(!(await page.locator('#bubbleDetails').innerText()).includes('sideCount'));
        await page.keyboard.press('Escape');assert.equal(await page.locator('#citizenPanel').isVisible(),false);
        results.push('PASS optional notebook, privacy and Escape');
        // Move to an open road well away from the citizen, queue then cancel via keyboard.
        await page.evaluate(id=>{FlatlandDebug.teleport(1728,1500);FlatlandDebug.openCitizen(id);},id);
        await page.locator('[data-group="talk"]').click();await page.locator('[data-topic="chat"]').click();
        await page.keyboard.down('KeyD');await page.evaluate(()=>FlatlandDebug.advance(.1));await page.keyboard.up('KeyD');
        const cancelled=await page.evaluate(()=>FlatlandDebug.snapshot());assert.equal(await page.locator('#cancelApproachBtn').isVisible(),false);assert.ok(cancelled.player.x>1728);
        await page.evaluate(id=>FlatlandDebug.openCitizen(id),id);await page.locator('[data-group="talk"]').click();await page.locator('[data-topic="chat"]').click();await page.evaluate(()=>FlatlandDebug.advance(.1));await page.locator('#cancelApproachBtn').click();const atCancel=(await page.evaluate(()=>FlatlandDebug.snapshot())).player;await page.evaluate(()=>FlatlandDebug.advance(.4));const stopped=(await page.evaluate(()=>FlatlandDebug.snapshot())).player;assert.equal(stopped.x,atCancel.x);assert.equal(stopped.y,atCancel.y);
        results.push('PASS manual movement and Cancel interrupt queued actions');
        for(const [width,height] of [[390,844],[844,390],[1280,800]]){
            await page.setViewportSize({width,height});await page.evaluate(id=>FlatlandDebug.openCitizen(id),id);
            for(const group of ['root','details']){
                if(group==='details')await page.locator('[data-group="details"]').click();
                const box=await page.locator('#citizenPanel').boundingBox();assert.ok(box.x>=0 && box.y>=0 && box.x+box.width<=width+1 && box.y+box.height<=height+1);
                assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
                if(group==='details')await page.locator('#bubbleBackBtn').click();
            }
            await page.screenshot({path:path.join(out,`bubble-${width}x${height}.png`)});await page.keyboard.press('Escape');
        }
        results.push('PASS compact menu and Details fit desktop, portrait and short landscape');
        const touch=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2}),phone=await touch.newPage();phone.on('pageerror',e=>errors.push(e.message));await phone.goto(url);await phone.locator('#startBtn').tap();await phone.evaluate(()=>FlatlandDebug.manual());
        const point=await phone.evaluate(()=>{const s=FlatlandDebug.snapshot(),c=s.npcs[0];return FlatlandDebug.worldToScreen(c.x,c.y);});
        await phone.touchscreen.tap(point.x,point.y);assert.equal(await phone.locator('#citizenPanel').isVisible(),true);await phone.locator('[data-topic="introduce"]').tap();await phone.evaluate(()=>FlatlandDebug.advance(3));assert.equal(await phone.locator('#speechBubble').isVisible(),true);await phone.screenshot({path:path.join(out,'bubble-touch-reply.png')});
        results.push('PASS native emulated touch selection and action');
        assert.deepEqual(errors,[]);console.log(results.join('\n'));fs.writeFileSync(path.join(out,'bubble-results.json'),JSON.stringify({results,errors,browser:browser.version()},null,2));
    }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
