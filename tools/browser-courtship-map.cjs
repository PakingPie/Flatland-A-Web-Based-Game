// Courtship markers and compact maps in isolated desktop/touch browser contexts.
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
        page.on('pageerror',e=>errors.push(e.message));
        await context.addInitScript(()=>{
            window.courtMarks={world:[],minimap:[]};const p=CanvasRenderingContext2D.prototype;
            const arc=p.arc,fill=p.fill,stroke=p.stroke,rect=p.fillRect;
            p.arc=function(x,y,r,...args){this.lastCourtArc={x,y,r};return arc.call(this,x,y,r,...args);};
            p.fillRect=function(x,y,w,h){if(x===0&&y===0&&courtMarks[this.canvas.id])courtMarks[this.canvas.id]=[];return rect.call(this,x,y,w,h);};
            p.stroke=function(...args){if(this.canvas.id==='world'&&this.strokeStyle==='#e7a5c4'){const t=this.getTransform();courtMarks.world.push({x:t.e,y:t.f});}return stroke.apply(this,args);};
            p.fill=function(...args){if(this.canvas.id==='minimap'&&this.fillStyle==='#e7a5c4')courtMarks.minimap.push({...this.lastCourtArc});return fill.apply(this,args);};
        });
        const url=`http://127.0.0.1:${server.address().port}/?debug=1`;
        await page.goto(url);
        const fixture=await page.evaluate(()=>{
            FlatlandDebug.start('courtship-markers');FlatlandDebug.manual();FlatlandDebug.renewal(false);
            const d=JSON.parse(FlatlandDebug.exportSave()),s=d.payload;
            const a=s.characters.find(c=>c.id===s.currentPlayerId),n=s.characters.filter(c=>c.id!==a.id);
            const targets=[n.find(c=>c.actual.identity.sex==='female'),n.find(c=>c.actual.identity.sex==='male')];
            const hidden=n.find(c=>!targets.includes(c));
            for(const [i,b] of [...targets,hidden].entries()) {
                const ids=[a.id,b.id].sort();
                s.romance.pairs[ids.join('|')]={ids,affection:45,status:'courting',knownBy:[],lastAt:-999,day:-1,today:0,topics:{},lastOutcome:'',lastBirthYear:-999};
                if(i<2) {b.playerKnowledge.discoveredFacts.name={value:b.actual.identity.name,kind:'claim',sourceId:b.id,at:s.elapsed};b.x=b.px=a.x+(i?72:0);b.y=b.py=a.y+(i?0:-60);}
            }
            return {data:d,targets:targets.map(c=>({id:c.id,x:c.x,y:c.y})),hidden:hidden.id};
        });
        const install=async(targetPage,data)=>{
            await targetPage.evaluate(d=>{
                const text=JSON.stringify(d.payload);let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}d.checksum=h>>>0;
                if(!FlatlandDebug.importSave(JSON.stringify(d)))throw Error('Invalid courtship fixture');FlatlandDebug.manual();
            },data);
            await targetPage.locator('#resumeBtn').click();
        };
        const waitMarks=async(p,count)=>p.waitForFunction(n=>courtMarks.minimap.length===n,count);
        await install(page,fixture.data);await waitMarks(page,2);
        const before=await page.evaluate(()=>JSON.parse(FlatlandDebug.exportSave()).payload);
        const marks=await page.evaluate(()=>{const s=FlatlandDebug.snapshot();return {map:courtMarks.minimap,world:courtMarks.world.map(p=>FlatlandDebug.screenToWorld(p.x/s.viewport.dpr,p.y/s.viewport.dpr))};});
        assert.deepEqual(marks.map.map(p=>[p.x,p.y]).sort(),fixture.targets.map(p=>[p.x,p.y]).sort());
        assert.equal(marks.world.length,2);assert.ok(marks.world.every(p=>fixture.targets.some(c=>Math.hypot(c.x-p.x,c.y-p.y)<.01)));
        assert.deepEqual(await page.evaluate(()=>JSON.parse(FlatlandDebug.exportSave()).payload),before);
        await page.screenshot({path:path.join(out,'courtship-map-desktop.png')});
        results.push('PASS pink world rings and readable minimap markers identify both known active courtships; unknown names stay hidden and rendering changes no saved state');
        assert.equal(await page.evaluate(()=>FlatlandDebug.save()),true);
        await page.reload();await page.locator('#continueBtn').click();await page.evaluate(()=>FlatlandDebug.manual());await page.locator('#resumeBtn').click();await waitMarks(page,2);
        results.push('PASS active courtship highlights return after save and reload');
        const ended=structuredClone(fixture.data);
        for(const p of Object.values(ended.payload.romance.pairs))p.status='declined';
        await install(page,ended);await waitMarks(page,0);
        assert.equal(await page.evaluate(()=>courtMarks.world.length),0);
        results.push('PASS markers disappear when courtship ends');
        const married=structuredClone(fixture.data),s=married.payload,a=s.characters.find(c=>c.id===s.currentPlayerId),b=s.characters.find(c=>c.id===fixture.targets[0].id);
        const key=[a.id,b.id].sort().join('|');s.romance.pairs[key].status='married';
        s.romance.marriages=[{id:'marriage-1',ids:[a.id,b.id],at:s.elapsed,endedAt:null,reason:null}];
        a.actual.bonds={partnerIds:[b.id],marriageIds:['marriage-1']};b.actual.bonds={partnerIds:[a.id],marriageIds:['marriage-1']};
        s.renewal.households['marriage-1']={anchorId:a.id,cohorts:0,origin:'player'};
        await install(page,married);await waitMarks(page,0);assert.equal(await page.evaluate(()=>courtMarks.world.length),0);
        results.push('PASS marriage clears courting highlights, including unfinished courtships with other people');
        const phoneContext=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2});
        // Share only instrumentation, never browser save slots.
        await phoneContext.addInitScript(()=>{window.courtMarks={minimap:[]};const p=CanvasRenderingContext2D.prototype,arc=p.arc,fill=p.fill,rect=p.fillRect;
            p.arc=function(x,y,r,...args){this.lastCourtArc={x,y,r};return arc.call(this,x,y,r,...args);};
            p.fillRect=function(x,y,w,h){if(this.canvas.id==='minimap'&&x===0&&y===0)courtMarks.minimap=[];return rect.call(this,x,y,w,h);};
            p.fill=function(...args){if(this.canvas.id==='minimap'&&this.fillStyle==='#e7a5c4')courtMarks.minimap.push({...this.lastCourtArc});return fill.apply(this,args);};
        });
        const phone=await phoneContext.newPage();phone.on('pageerror',e=>errors.push(e.message));await phone.goto(url);await install(phone,fixture.data);
        for(const [width,height] of [[390,844],[360,740],[844,390],[667,375],[568,320]]) {
            await phone.setViewportSize({width,height});await waitMarks(phone,2);
            assert.equal(await phone.locator('#minimap').isVisible(),true);
            const layout=await phone.evaluate(()=>{
                const box=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};};
                const map=box(document.querySelector('.map-panel'));
                const overlaps=[...document.querySelectorAll('.topbar,.objectives,.bottom-center,#joystick')].filter(e=>e.getBoundingClientRect().width).filter(e=>{const b=box(e);return map.x<b.x+b.w&&map.x+map.w>b.x&&map.y<b.y+b.h&&map.y+map.h>b.y;}).map(e=>e.className||e.id);
                return {map,overlaps,overflow:document.documentElement.scrollWidth>innerWidth};
            });
            assert.ok(layout.map.x>=0&&layout.map.y>=0&&layout.map.x+layout.map.w<=width&&layout.map.y+layout.map.h<=height,JSON.stringify(layout));
            assert.deepEqual(layout.overlaps,[],`${width}x${height}: ${JSON.stringify(layout)}`);assert.equal(layout.overflow,false);
            await phone.screenshot({path:path.join(out,`courtship-map-${width}x${height}.png`)});
        }
        results.push('PASS visible minimap and courtship markers fit five touch portrait/landscape sizes without covering objectives, top bar, joystick or actions');
        assert.deepEqual(errors,[]);console.log(results.join('\n'));fs.writeFileSync(path.join(out,'courtship-map-results.json'),JSON.stringify({results,errors,browser:browser.version()},null,2));
    } finally {if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
