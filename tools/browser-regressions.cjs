// Focused preservation checks for the original survival/Canvas/touch systems.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const {chromium}=process.env.FLATLAND_NODE_MODULES?createRequire(path.join(process.env.FLATLAND_NODE_MODULES,'_resolve.cjs'))('playwright'):require('playwright');
const output=path.resolve('output/playwright');fs.mkdirSync(output,{recursive:true});
(async()=>{
    const server=require('node:http').createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(fs.readFileSync('the-flatland.html'));});
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const url=`http://127.0.0.1:${server.address().port}/the-flatland.html?debug=1`;
    let browser;const errors=[],results=[];
    try {
        browser=await chromium.launch({headless:true,executablePath:process.env.FLATLAND_CHROMIUM||undefined});
        const desktop=await browser.newContext({viewport:{width:1440,height:900}}),page=await desktop.newPage();
        page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());await page.goto(url);
        // Real v2 JSON is installed in native storage before Continue. No adapter.
        await page.evaluate(raw=>localStorage.setItem('flatland.manual.v1',raw),fs.readFileSync('tools/fixtures/phase2a-v2.json','utf8'));await page.reload();await page.locator('#continueBtn').click();
        await page.evaluate(()=>FlatlandDebug.manual());let s=await page.evaluate(()=>FlatlandDebug.snapshot());
        assert.equal(s.seed,'phase2a-fixture');assert.equal(s.pack.food,4);assert.equal(s.pack.water,5);assert.equal(s.npcs[0].playerKnowledge.relationship.trust,31);assert.equal(s.resources[0].quantity,0);
        assert.equal(JSON.parse(await page.evaluate(()=>localStorage.getItem('flatland.manual.v1'))).version,2);
        await page.locator('#saveBtn').click();assert.equal(JSON.parse(await page.evaluate(()=>localStorage.getItem('flatland.manual.v1'))).version,5);
        results.push('PASS native Phase 2A Continue migration, preserved inventory/resources/trust, explicit v5 save');
        await page.evaluate(()=>{FlatlandDebug.start('regression');FlatlandDebug.manual();FlatlandDebug.teleport(1728,1280);});
        await page.keyboard.down('KeyW');await page.evaluate(()=>FlatlandDebug.advance(.5));await page.keyboard.up('KeyW');
        s=await page.evaluate(()=>FlatlandDebug.snapshot());const walk=1280-s.player.y;assert.ok(walk>60 && walk<75);
        await page.evaluate(()=>{FlatlandDebug.teleport(1728,1280);FlatlandDebug.vitals({stamina:100});});
        await page.keyboard.down('Shift');await page.keyboard.down('KeyW');await page.evaluate(()=>FlatlandDebug.advance(.5));await page.keyboard.up('KeyW');await page.keyboard.up('Shift');
        s=await page.evaluate(()=>FlatlandDebug.snapshot());assert.ok(1280-s.player.y>walk*1.5);assert.ok(s.player.vitals.stamina<90);
        results.push('PASS keyboard walking, sprint speed and stamina');
        const collision=await page.evaluate(()=>{
            const s=FlatlandDebug.snapshot(),r=s.player.body.radius;
            for(const b of s.obstacles.filter(o=>o.kind==='building')) {try{FlatlandDebug.teleport(b.x-r-2,b.y+b.h/2);return b;}catch{}}
            throw Error('No accessible collision fixture');
        });
        await page.keyboard.down('KeyD');await page.evaluate(()=>FlatlandDebug.advance(2));await page.keyboard.up('KeyD');s=await page.evaluate(()=>FlatlandDebug.snapshot());assert.ok(s.player.x<=collision.x-s.player.body.radius+.01);
        results.push('PASS building collision still blocks movement');
        const gathered=await page.evaluate(()=>{
            const s=FlatlandDebug.snapshot();for(const r of s.resources.filter(r=>r.kind==='food'&&r.quantity))for(let i=0;i<16;i++){try{FlatlandDebug.teleport(r.x+Math.cos(i*Math.PI/8)*25,r.y+Math.sin(i*Math.PI/8)*25);return {id:r.id,quantity:r.quantity,food:s.pack.food};}catch{}}
            throw Error('No gather fixture');
        });
        await page.keyboard.down('KeyE');await page.evaluate(()=>FlatlandDebug.advance(.45));await page.keyboard.up('KeyE');s=await page.evaluate(()=>FlatlandDebug.snapshot());assert.ok(s.pack.food>gathered.food);assert.ok(s.resources.find(r=>r.id===gathered.id).quantity<gathered.quantity);
        await page.evaluate(()=>FlatlandDebug.vitals({hunger:50,thirst:50}));await page.locator('#eatBtn').click();await page.locator('#drinkBtn').click();s=await page.evaluate(()=>FlatlandDebug.snapshot());assert.equal(s.player.vitals.hunger,88);assert.equal(s.player.vitals.thirst,95);
        results.push('PASS resource gathering, inventory and food/water consumption');
        await page.evaluate(()=>{FlatlandDebug.teleport(1728,1000);FlatlandDebug.vitals({health:50,hunger:80,thirst:80,stamina:40});});
        await page.keyboard.press('Space');await page.evaluate(()=>FlatlandDebug.advance(2));s=await page.evaluate(()=>FlatlandDebug.snapshot());assert.equal(s.player.vitals.health,50);assert.ok(s.player.vitals.stamina>80);assert.ok((await page.locator('#context').innerText()).includes('no healing'));
        await page.keyboard.press('Space');await page.evaluate(()=>FlatlandDebug.teleport(1728,1280));await page.keyboard.press('Space');await page.evaluate(()=>FlatlandDebug.advance(2));s=await page.evaluate(()=>FlatlandDebug.snapshot());assert.ok(s.player.vitals.health>53);
        await page.keyboard.down('KeyW');await page.evaluate(()=>FlatlandDebug.advance(.1));await page.keyboard.up('KeyW');s=await page.evaluate(()=>FlatlandDebug.snapshot());assert.equal(s.player.runtime.resting,false);
        results.push('PASS field rest, refuge healing and movement interrupt');
        const beforeNPC=s.npcs;await page.evaluate(()=>{FlatlandDebug.vitals({health:100,hunger:100,thirst:100});FlatlandDebug.advance(10);});s=await page.evaluate(()=>FlatlandDebug.snapshot());assert.ok(s.npcs.some((c,i)=>Math.hypot(c.x-beforeNPC[i].x,c.y-beforeNPC[i].y)>5));assert.deepEqual(await page.evaluate(()=>FlatlandDebug.validate()),[]);
        await page.locator('#pauseBtn').click();const time=s.time;await page.evaluate(()=>FlatlandDebug.advance(10));assert.equal((await page.evaluate(()=>FlatlandDebug.snapshot())).time,time);await page.locator('#resumeBtn').click();
        results.push('PASS autonomous NPC navigation, actor validity, pause and resume');
        for(const [width,height] of [[1440,900],[390,844],[844,390]]) {
            await page.setViewportSize({width,height});
            for(const corner of [0,1,2,3]) {
                const clear=await page.evaluate(corner=>{
                    const s=FlatlandDebug.snapshot(),r=s.player.body.radius;
                    FlatlandDebug.teleport(corner%2?3456-r-17:r+17,corner<2?r+17:2304-r-17);
                    const layout=FlatlandDebug.cameraLayout(),p=FlatlandDebug.worldToScreen(FlatlandDebug.snapshot().player.x,FlatlandDebug.snapshot().player.y);
                    return layout.blockers.every(b=>{const x=Math.max(b.x,Math.min(b.x+b.w,p.x)),y=Math.max(b.y,Math.min(b.y+b.h,p.y));return Math.hypot(x-p.x,y-p.y)>r+5;});
                },corner);assert.ok(clear,`HUD clearance ${width}x${height} corner ${corner}`);
            }
        }
        results.push('PASS twelve world-corner/HUD clearance checks across desktop, portrait and landscape');
        const touch=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2}),phone=await touch.newPage();phone.on('pageerror',e=>errors.push(e.message));await phone.goto(url);await phone.locator('#startBtn').tap();await phone.evaluate(()=>FlatlandDebug.manual());
        const start=await phone.evaluate(()=>FlatlandDebug.snapshot()),joy=await phone.locator('#joystick').boundingBox();assert.ok(joy);
        const cdp=await touch.newCDPSession(phone),x=joy.x+joy.width/2,y=joy.y+joy.height/2;
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+30,y}]});await phone.evaluate(()=>FlatlandDebug.advance(.2));await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        assert.ok((await phone.evaluate(()=>FlatlandDebug.snapshot())).player.x>start.player.x);
        await phone.locator('#pauseBtn').tap();await phone.locator('#pauseFamilyBtn').tap();assert.equal((await phone.evaluate(()=>FlatlandDebug.snapshot())).state,'family');await phone.screenshot({path:path.join(output,'touch-family.png')});await phone.locator('#closeFamilyBtn').tap();await phone.locator('#resumeBtn').tap();await phone.setViewportSize({width:844,height:390});await phone.locator('#pauseBtn').tap();await phone.locator('#pauseFamilyBtn').tap();assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await phone.screenshot({path:path.join(output,'touch-landscape.png')});
        results.push('PASS emulated native touch joystick and family controls in portrait/landscape');
        const production=await desktop.newPage();await production.goto(url.replace('?debug=1',''));assert.equal(await production.evaluate(()=>typeof window.FlatlandDebug),'undefined');
        const offline=await desktop.newPage();await offline.goto(require('node:url').pathToFileURL(path.resolve('the-flatland.html')).href);await offline.locator('#startBtn').click();assert.equal(await offline.locator('#hud').isVisible(),true);
        results.push('PASS production debug exclusion and standalone file opening');
        assert.deepEqual(errors,[]);console.log(results.join('\n'));fs.writeFileSync(path.join(output,'regression-results.json'),JSON.stringify({results,errors,browser:browser.version()},null,2));
    }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
