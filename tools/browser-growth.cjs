// Controlled ages/positions; actual Canvas geometry, save loading and day buttons.
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
        await page.addInitScript(()=>{
            window.bodyMarks=[];const p=CanvasRenderingContext2D.prototype;
            const begin=p.beginPath,move=p.moveTo,line=p.lineTo,stroke=p.stroke,rect=p.fillRect;
            p.beginPath=function(...args){this.testPoints=[];return begin.apply(this,args);};
            const record=(ctx,x,y)=>{const t=ctx.getTransform();ctx.testPoints?.push({x:t.a*x+t.c*y+t.e,y:t.b*x+t.d*y+t.f});};
            p.moveTo=function(x,y){record(this,x,y);return move.call(this,x,y);};
            p.lineTo=function(x,y){record(this,x,y);return line.call(this,x,y);};
            p.fillRect=function(x,y,w,h){if(this.canvas.id==='world'&&x===0&&y===0) window.bodyMarks=[];return rect.call(this,x,y,w,h);};
            p.stroke=function(...args){if(this.canvas.id==='world'&&Math.abs(this.lineWidth-1.6)<1e-5&&this.testPoints?.length>=3) {
                const t=this.getTransform();window.bodyMarks.push({x:t.e,y:t.f,extent:Math.max(...this.testPoints.map(v=>Math.hypot(v.x-t.e,v.y-t.f))),width:this.lineWidth});
            }return stroke.apply(this,args);};
        });
        await page.goto(`http://127.0.0.1:${server.address().port}/?debug=1`);
        const setup=await page.evaluate(()=>{
            FlatlandDebug.start('growth-gallery');FlatlandDebug.manual();FlatlandDebug.renewal(false);
            const d=JSON.parse(FlatlandDebug.exportSave()),s=d.payload,ages=[0,6,18,65],labels=['Child','Teen','Adult','Elder'],ids=[];
            const hash=text=>{let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};
            const chosen=['male','female'].flatMap(sex=>s.characters.filter(c=>c.id!==s.currentPlayerId&&c.actual.identity.sex===sex&&c.actual.genome.size<=1.1).slice(0,4));
            if(chosen.length!==8)throw Error('Missing growth fixture subjects');
            chosen.forEach((c,i)=>{
                const age=ages[i%4],x=1410+i*90;FlatlandDebug.teleport(x,1152);
                c.x=c.px=x;c.y=c.py=1152;c.actual.life.ageYears=age;
                c.playerKnowledge.discoveredFacts.name={value:`${labels[i%4]} ${age}d`,kind:'confirmed',sourceId:'player',at:s.elapsed};
                c.identitySignature=hash(JSON.stringify({id:c.id,genome:c.actual.genome,form:c.actual.identity.bodyForm,age}));ids.push(c.id);
            });
            FlatlandDebug.teleport(1728,1240);
            const player=s.characters.find(c=>c.id===s.currentPlayerId);player.y=player.py=1240;
            d.payload=s;d.checksum=hash(JSON.stringify(s));if(!FlatlandDebug.importSave(JSON.stringify(d)))throw Error('Growth fixture rejected');
            FlatlandDebug.manual();return {ids,raw:FlatlandDebug.exportSave()};
        });
        await page.locator('#resumeBtn').click();
        const inspect=()=>page.evaluate(async ids=>{
            await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
            const s=FlatlandDebug.snapshot();return ids.map(id=>{
                const c=s.npcs.find(c=>c.id===id),pos=FlatlandDebug.worldToScreen(c.x,c.y),mark=bodyMarks.find(m=>Math.hypot(m.x/s.viewport.dpr-pos.x,m.y/s.viewport.dpr-pos.y)<.01);
                if(!mark)throw Error(`No rendered body for ${id}`);
                const base=Math.max(...c.body.points.map(p=>Math.hypot(...p)));
                return {id,age:c.actual.life.ageYears,ratio:mark.extent/s.viewport.dpr/base,stroke:mark.width,radius:c.body.radius,genome:c.actual.genome};
            });
        },setup.ids);
        const initial=await inspect();initial.forEach((m,i)=>{assert.ok(Math.abs(m.ratio-[.45,.7,1,.85][i%4])<1e-7);assert.ok(Math.abs(m.stroke-1.6)<1e-5);});
        assert.deepEqual(JSON.parse(await page.evaluate(()=>FlatlandDebug.exportSave())).payload,JSON.parse(setup.raw).payload);
        await page.screenshot({path:path.join(out,'growth-stages-desktop.png')});
        results.push('PASS actual polygon and line bodies render at 45/70/100/85 percent with readable unscaled outlines and no save/RNG mutation');
        await page.keyboard.press('KeyP');await page.locator('#pauseFamilyBtn').click();await page.locator('#advance5Btn').click();await page.locator('#advance1Btn').click();await page.locator('#closeFamilyBtn').click();await page.locator('#resumeBtn').click();
        const grown=await inspect();for(const i of [0,4]) {assert.equal(grown[i].age,6);assert.ok(Math.abs(grown[i].ratio-.7)<1e-7);assert.equal(grown[i].radius,initial[i].radius);assert.deepEqual(grown[i].genome,initial[i].genome);}
        results.push('PASS actual 5-day plus 1-day refuge advance grows both newborn forms at day 6 without changing physical radius or hereditary geometry');
        await page.keyboard.press('KeyP');await page.locator('#saveBtn').click();const saved=await page.evaluate(()=>JSON.parse(FlatlandDebug.exportSave()).payload);
        await page.reload();await page.locator('#continueBtn').click();await page.evaluate(()=>FlatlandDebug.manual());await page.locator('#resumeBtn').click();assert.deepEqual(await page.evaluate(()=>JSON.parse(FlatlandDebug.exportSave()).payload),saved);
        const loaded=await inspect();loaded.forEach((m,i)=>assert.ok(Math.abs(m.ratio-grown[i].ratio)<1e-7));
        results.push('PASS native save/reload derives the same growth stages without new saved fields or loss of progress');
        await page.evaluate(ids=>{
            const d=JSON.parse(FlatlandDebug.exportSave()),s=d.payload;
            const hash=text=>{let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};
            for(const [index,age] of [[1,17],[5,17],[2,64],[6,64]]) {
                const c=s.characters.find(c=>c.id===ids[index]);c.actual.life.ageYears=age;
                c.identitySignature=hash(JSON.stringify({id:c.id,genome:c.actual.genome,form:c.actual.identity.bodyForm,age}));
            }
            d.checksum=hash(JSON.stringify(s));if(!FlatlandDebug.importSave(JSON.stringify(d)))throw Error('Boundary fixture rejected');FlatlandDebug.manual();
        },setup.ids);
        await page.locator('#pauseFamilyBtn').click();await page.locator('#advance1Btn').click();await page.locator('#closeFamilyBtn').click();await page.locator('#resumeBtn').click();
        const boundaries=await inspect();for(const i of [1,5]) {assert.equal(boundaries[i].age,18);assert.ok(Math.abs(boundaries[i].ratio-1)<1e-7);}
        for(const i of [2,6]) {assert.equal(boundaries[i].age,65);assert.ok(Math.abs(boundaries[i].ratio-.85)<1e-7);}
        results.push('PASS actual day advancement switches polygon and line teenagers to full adults at 18 and adults to smaller elders at 65');
        for(const [width,height] of [[390,844],[844,390]]) {await page.setViewportSize({width,height});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:path.join(out,`growth-stages-${width}x${height}.png`)});}
        assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'growth-results.json'),JSON.stringify({results,errors,initial,browser:browser.version()},null,2));console.log(results.join('\n'));
    } finally {if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
