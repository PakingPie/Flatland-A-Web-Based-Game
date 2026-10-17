// Subtraction UI: real controls, simulation boundaries and isolated browser preferences.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const {chromium}=process.env.FLATLAND_NODE_MODULES?createRequire(path.join(process.env.FLATLAND_NODE_MODULES,'_resolve.cjs'))('playwright'):require('playwright');
const out=path.resolve('output/playwright');fs.mkdirSync(out,{recursive:true});
(async()=>{
    const server=require('node:http').createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(fs.readFileSync('the-flatland.html'));});
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const url=`http://127.0.0.1:${server.address().port}/the-flatland.html?debug=1`;
    let browser;const errors=[],results=[];
    try {
        browser=await chromium.launch({headless:true,executablePath:process.env.FLATLAND_CHROMIUM||undefined});
        const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();
        page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
        const start=async()=>page.evaluate(()=>{FlatlandDebug.manual();FlatlandDebug.start('ui-subtraction');});
        const snapshot=()=>page.evaluate(()=>FlatlandDebug.snapshot());
        await start();
        assert.equal(await page.locator('.actionbar button:visible').count(),2);
        assert.equal(await page.locator('#helpBtn').count(),0);
        assert.equal(await page.locator('.control-tip').count(),0);
        const beforeHud=await page.evaluate(()=>JSON.parse(FlatlandDebug.exportSave()).payload);
        await page.evaluate(()=>{for(let i=0;i<5;i++)FlatlandDebug.advance(0);});
        assert.deepEqual(await page.evaluate(()=>JSON.parse(FlatlandDebug.exportSave()).payload),beforeHud);
        await page.evaluate(()=>{FlatlandDebug.vitals({hunger:51,thirst:51});FlatlandDebug.advance(.1);});
        assert.deepEqual((await snapshot()).pack,{food:1,water:1});
        await page.evaluate(()=>{FlatlandDebug.vitals({hunger:49,thirst:49});FlatlandDebug.pause();FlatlandDebug.advance(1);});
        assert.deepEqual((await snapshot()).pack,{food:1,water:1});
        await page.locator('#resumeBtn').click();await page.evaluate(()=>FlatlandDebug.advance(1/60));
        let s=await snapshot();assert.deepEqual(s.pack,{food:0,water:0});
        assert.ok(s.player.vitals.hunger>86 && s.player.vitals.hunger<87);
        assert.ok(s.player.vitals.thirst>93 && s.player.vitals.thirst<94);
        assert.match(await page.locator('#log').innerText(),/Auto · Drank water.*0 left/);
        assert.equal(await page.locator('#foodCount').innerText(),'0/8');
        await page.evaluate(()=>{FlatlandDebug.vitals({hunger:0,thirst:0});FlatlandDebug.advance(1);});
        s=await snapshot();assert.ok(s.player.vitals.health<100);assert.deepEqual(s.pack,{food:0,water:0});
        await start();await page.evaluate(()=>{FlatlandDebug.vitals({hunger:0,thirst:0});FlatlandDebug.advance(1/60);});
        s=await snapshot();assert.equal(s.player.vitals.health,100);assert.ok(s.player.vitals.hunger>30 && s.player.vitals.thirst>30);
        results.push('PASS automatic supplies below 50, no waste above threshold, pause safety, stock notices and empty-pack health loss');

        await start();await page.evaluate(()=>FlatlandDebug.pause());
        await page.locator('#pauseScreen summary').filter({hasText:'Settings'}).click();
        await page.locator('#autoSuppliesToggle').uncheck();
        const payload=await page.evaluate(()=>JSON.parse(FlatlandDebug.exportSave()).payload);
        await page.reload();assert.equal(await page.locator('#autoSuppliesToggle').isChecked(),false);
        await page.locator('#continueBtn').click();await page.evaluate(()=>FlatlandDebug.manual());
        assert.deepEqual(await page.evaluate(()=>JSON.parse(FlatlandDebug.exportSave()).payload),payload);
        await page.locator('#resumeBtn').click();
        await page.evaluate(()=>{FlatlandDebug.vitals({hunger:20,thirst:20});FlatlandDebug.advance(1);});
        assert.deepEqual((await snapshot()).pack,{food:1,water:1});
        await page.locator('#eatBtn').click();await page.locator('#drinkBtn').click();
        s=await snapshot();assert.deepEqual(s.pack,{food:0,water:0});assert.ok(s.player.vitals.hunger>57 && s.player.vitals.thirst>64);
        await page.locator('#pauseBtn').click();await page.locator('#pauseHelpBtn').click();
        assert.equal(await page.locator('#helpScreen').isVisible(),true);
        await page.locator('#closeHelpBtn').click();assert.equal(await page.locator('#pauseScreen').isVisible(),true);
        await page.locator('#resumeBtn').click();await page.keyboard.press('KeyH');assert.equal(await page.locator('#helpScreen').isVisible(),true);
        await page.keyboard.press('KeyH');
        results.push('PASS persisted opt-out, exact save round trip, manual meter controls and Pause/H Help');

        // A held button is tied to the displayed resource; depletion cannot open Talk.
        await start();
        const resource=await page.evaluate(()=>{
            for(const r of FlatlandDebug.snapshot().resources.filter(r=>r.kind==='food'&&r.quantity)) {
                try { FlatlandDebug.teleport(r.x+25,r.y); } catch {continue;}
                if(document.getElementById('interactLabel').textContent==='Gather berries') return r;
            }
            throw Error('No isolated gather fixture');
        });
        await page.evaluate(id=>{FlatlandDebug.setResource(id,1);FlatlandDebug.advance(0);},resource.id);
        await page.locator('#interactBtn').hover();await page.mouse.down();await page.evaluate(()=>FlatlandDebug.advance(1));
        s=await snapshot();assert.equal(s.pack.food,2);assert.equal(s.resources.find(r=>r.id===resource.id).quantity,0);
        assert.equal(await page.locator('#citizenPanel').isVisible(),false);
        await page.mouse.up();assert.equal((await snapshot()).holds.gather,false);
        await page.evaluate(()=>FlatlandDebug.advance(0));
        // Full stock must also release a captured hold.
        await page.evaluate(id=>{FlatlandDebug.setResource(id,8);FlatlandDebug.advance(0);},resource.id);
        await page.locator('#interactBtn').hover();await page.mouse.down();
        for(let i=0;i<3;i++) await page.evaluate(id=>{FlatlandDebug.setResource(id,8);FlatlandDebug.advance(2);},resource.id);
        await page.mouse.up();
        s=await snapshot();assert.equal(s.pack.food,8);assert.equal(s.holds.gather,false);
        results.push('PASS held resource gathering, depletion/full-pack release and no accidental conversation');

        const citizen=await page.evaluate(()=>{
            const s=FlatlandDebug.snapshot();
            for(const c of s.npcs) for(const dx of [40,-40,0]) {
                try {FlatlandDebug.teleport(c.x+dx,c.y+30);}catch{continue;}
                if(document.getElementById('interactLabel').textContent.startsWith('Talk to ')) return c.id;
            }
            throw Error('No contextual citizen fixture');
        });
        await page.locator('#interactBtn').click();assert.equal(await page.locator('#citizenPanel').isVisible(),true);
        const paused=await snapshot();await page.evaluate(()=>FlatlandDebug.advance(1));assert.equal((await snapshot()).time,paused.time);
        await page.keyboard.press('Escape');
        // Native keyboard activation also opens Talk, retaining focus in the menu.
        await page.locator('#interactBtn').focus();await page.keyboard.press('Enter');
        assert.equal(await page.locator('#citizenPanel').isVisible(),true);
        assert.equal(await page.locator('#closeCitizenBtn').evaluate(el=>el===document.activeElement),true);
        await page.keyboard.press('Escape');await page.evaluate(id=>FlatlandDebug.openCitizen(id),citizen);await page.keyboard.press('Escape');
        results.push('PASS contextual Talk, citizen-menu pause and keyboard focus');

        await start();await page.evaluate(()=>FlatlandDebug.pause());
        if(!await page.locator('#autoSuppliesToggle').isVisible()) await page.locator('#pauseScreen summary').filter({hasText:'Settings'}).click();
        await page.locator('#autoSuppliesToggle').check();await page.locator('#resumeBtn').click();
        await page.evaluate(()=>FlatlandDebug.advance(30));
        await page.screenshot({path:path.join(out,'ui-desktop.png')});
        const touch=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2}),phone=await touch.newPage();
        phone.on('pageerror',e=>errors.push(e.message));await phone.goto(url);
        await phone.evaluate(()=>{FlatlandDebug.manual();FlatlandDebug.start('ui-touch');FlatlandDebug.teleport(1728,1280);});
        assert.equal(await phone.locator('.actionbar button:visible').count(),3);
        const cdp=await touch.newCDPSession(phone),joy=await phone.locator('#joystick').boundingBox(),sprint=await phone.locator('#sprintBtn').boundingBox();
        const j={x:joy.x+joy.width/2+30,y:joy.y+joy.height/2,id:1},run={x:sprint.x+sprint.width/2,y:sprint.y+sprint.height/2,id:2};
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[j,run]});
        await phone.evaluate(()=>FlatlandDebug.advance(.2));
        let mobile=await phone.evaluate(()=>FlatlandDebug.snapshot());assert.equal(mobile.player.runtime.sprinting,true);assert.ok(mobile.player.vitals.stamina<100);
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        mobile=await phone.evaluate(()=>FlatlandDebug.snapshot());assert.equal(mobile.holds.sprint,false);assert.deepEqual(mobile.touch,{x:0,y:0});
        await phone.evaluate(()=>FlatlandDebug.advance(1/60));
        for(const [width,height] of [[390,844],[320,568],[844,390]]) {
            await phone.setViewportSize({width,height});await phone.evaluate(()=>FlatlandDebug.advance(0));
            for(const selector of ['#interactBtn','#restBtn','#sprintBtn','#eatBtn','#drinkBtn','#pauseBtn','#joystick']) {
                const box=await phone.locator(selector).boundingBox();assert.ok(box && box.x>=0 && box.y>=0 && box.x+box.width<=width+1 && box.y+box.height<=height+1,`${selector} within ${width}x${height}`);
                const hit=await phone.locator(selector).evaluate(el=>{const b=el.getBoundingClientRect();return el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));});assert.ok(hit,`${selector} receives taps at ${width}x${height}`);
            }
            assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
            const overlap=await phone.evaluate(()=>{const a=document.getElementById('joystick').getBoundingClientRect(),b=document.querySelector('.vitals').getBoundingClientRect();return a.left<b.right && a.right>b.left && a.top<b.bottom && a.bottom>b.top;});
            assert.equal(overlap,false,`joystick clears meters at ${width}x${height}`);
            const panelsOverlap=await phone.evaluate(()=>{const a=document.querySelector('.objectives').getBoundingClientRect(),b=document.querySelector('.vitals').getBoundingClientRect();return a.width>0 && a.height>0 && a.left<b.right && a.right>b.left && a.top<b.bottom && a.bottom>b.top;});
            assert.equal(panelsOverlap,false,`objectives clear meters at ${width}x${height}`);
            await phone.screenshot({path:path.join(out,`ui-touch-${width}x${height}.png`)});
        }
        results.push('PASS simultaneous native touch joystick+sprint, release and reachable controls at three phone sizes');
        // Storage denial does not prevent defaults, settings changes or play.
        const denied=await browser.newContext(),blocked=await denied.newPage();blocked.on('pageerror',e=>errors.push(e.message));
        await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Test denial','SecurityError');}}));
        await blocked.goto(url);await blocked.evaluate(()=>{FlatlandDebug.manual();FlatlandDebug.start('ui-storage-denial');FlatlandDebug.pause();});
        await blocked.locator('#pauseScreen summary').filter({hasText:'Settings'}).click();await blocked.locator('#autoSuppliesToggle').uncheck();
        assert.match(await blocked.locator('#settingsStatus').innerText(),/Applied for this visit/);
        await blocked.locator('#resumeBtn').click();await blocked.evaluate(()=>FlatlandDebug.advance(1));
        results.push('PASS browser storage denial keeps settings and gameplay usable');
        assert.deepEqual(errors,[]);console.log(results.join('\n'));
        fs.writeFileSync(path.join(out,'ui-results.json'),JSON.stringify({results,errors,browser:browser.version()},null,2));
    } finally {if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
