// Curated documentation captures from isolated demo worlds, not player profiles.
// Writes only ignored output; review before promoting selected PNGs to docs/images.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const {chromium}=process.env.FLATLAND_NODE_MODULES?createRequire(path.join(process.env.FLATLAND_NODE_MODULES,'_resolve.cjs'))('playwright'):require('playwright');
const out=path.resolve('output/playwright/readme');fs.mkdirSync(out,{recursive:true});
const files=['core','genetics','characters','registry','navigation','world','social','romance','household','family-invariants','observer-notebooks','family-view','family','renewal','approach','save-format','save-validation','save-migrations','save-codec','persistence'];
const context=vm.createContext({document:{getElementById:()=>({textContent:'',hidden:true})}});
vm.runInContext(files.map(f=>fs.readFileSync(`src/${f}.js`,'utf8')).join('\n')+`
    const snapshot=w=>{
        const store=Object.create(SaveStore.prototype);store.revision=0;
        store.game={world:w,runId:'readme-demo',pack:{food:4,water:4},progress:{gathered:4,visited:new Set(['refuge-common']),complete:false},gatherCooldown:0,warningLatch:{},effects:[],messages:[],noticeUntil:0};
        return store.encode();
    };
    const w=new World('family');w.social.reputation.score=5;
    const spouse=w.npcs.find(c=>c.actual.identity.sex==='female' && c.actual.life.ageYears<=45 && w.romance.compatibility(w.player,c).ok && w.romance.preferences(c).familyLife>=.3);
    insist(spouse,'Missing demo partner');
    spouse.x=spouse.px=w.player.x+40;spouse.y=spouse.py=w.player.y;
    w.social.learn(spouse,'name',spouse.publicIdentity.displayName);spouse.playerKnowledge.relationship.trust=30;spouse.playerKnowledge.relationship.familiarity=50;
    const act=t=>{w.family.elapse(4);return w.romance.interact(spouse.id,t);};
    for(let day=0;day<6 && w.romance.pair(w.player,spouse).affection<42;day++) {w.family.elapse(120);for(const t of ['compliment','outing','commitment']) act(t);}
    const courtship=snapshot(w);w.family.elapse(120);insist(act('propose').ok,'Demo proposal failed');
    const children=w.family.birth();insist(children.ok,children.text);
    for(let day=0;day<4;day++) insist(w.family.advance(5).ok,'Demo days failed');w.family.advance(1);
    const family=snapshot(w);
    const gallery=new World('readme-growth'),specimens=[],labels=['Child · 0d','Teen · 6d','Adult · 18d','Elder · 65d'];
    const males=gallery.npcs.filter(c=>c.actual.identity.sex==='male').slice(0,4),females=gallery.npcs.filter(c=>c.actual.identity.sex==='female').slice(0,4);
    [...males,...females].forEach((c,i)=>{
        const age=[0,6,18,65][i%4];c.actual.life.ageYears=age;
        if(i<4) c.actual.genome=copyJSON(gallery.player.actual.genome);
        c.x=c.px=1410+i*90;c.y=c.py=1152;
        insist(gallery.circleClear(c.x,c.y,27),'Blocked demo position');
        gallery.social.learn(c,'name',labels[i%4],'confirmed','player');specimens.push(c.id);
    });
    gallery.player.y=gallery.player.py=1240;
    globalThis.demo={courtship,family,spouseId:spouse.id,childIds:children.ids,growth:snapshot(gallery),specimens};
`,context);
const demo=JSON.parse(JSON.stringify(context.demo));
(async()=>{
    const server=require('node:http').createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(fs.readFileSync('the-flatland.html'));});
    await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const errors=[];
    try {
        browser=await chromium.launch({headless:true,executablePath:process.env.FLATLAND_CHROMIUM||undefined});
        const browserContext=await browser.newContext({viewport:{width:1440,height:900}}),page=await browserContext.newPage();
        page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
        await page.goto(`http://127.0.0.1:${server.address().port}/?debug=1`);
        await page.evaluate(()=>{FlatlandDebug.start('flatland');FlatlandDebug.manual();FlatlandDebug.advance(2);});
        const settle=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
        await settle();await page.screenshot({path:path.join(out,'explore.png')});
        const install=async raw=>{await page.evaluate(raw=>{if(!FlatlandDebug.importSave(raw))throw Error('Demo import failed');FlatlandDebug.manual();},raw);await page.locator('#resumeBtn').click();await settle();};
        await install(demo.courtship);await page.evaluate(id=>FlatlandDebug.openCitizen(id),demo.spouseId);await page.locator('[data-group="romance"]').click();await settle();
        const b=await page.locator('#citizenPanel').boundingBox(),p=await page.evaluate(()=>{const p=FlatlandDebug.snapshot().player;return FlatlandDebug.worldToScreen(p.x,p.y);});
        const centerX=(Math.min(p.x-35,b.x)+Math.max(p.x+35,b.x+b.width))/2,centerY=(Math.min(p.y-35,b.y)+Math.max(p.y+35,b.y+b.height))/2;
        await page.screenshot({path:path.join(out,'relationships.png'),clip:{x:Math.max(0,Math.min(640,centerX-400)),y:Math.max(0,Math.min(420,centerY-240)),width:800,height:480}});
        await install(demo.family);await page.locator('#familyBtn').click();
        const last=page.locator('[data-member-id="'+demo.childIds.at(-1)+'"]');await last.scrollIntoViewIfNeeded();await settle();
        const firstBox=await page.locator('[data-member-id="'+demo.childIds[0]+'"]').boundingBox(),lastBox=await last.boundingBox();
        assert.ok(firstBox.y>=0 && lastBox.y+lastBox.height<=900);
        await page.screenshot({path:path.join(out,'succession.png'),clip:{x:firstBox.x-10,y:firstBox.y-10,width:firstBox.width+20,height:lastBox.y+lastBox.height-firstBox.y+20}});
        await install(demo.growth);
        const s=await page.evaluate(ids=>{const w=FlatlandDebug.snapshot();return ids.map(id=>{const c=w.npcs.find(c=>c.id===id);return FlatlandDebug.worldToScreen(c.x,c.y);});},demo.specimens);
        const left=Math.floor(Math.min(...s.map(p=>p.x))-45),top=Math.floor(Math.min(...s.map(p=>p.y))-80);
        await page.screenshot({path:path.join(out,'life-stages.png'),clip:{x:left,y:top,width:Math.ceil(Math.max(...s.map(p=>p.x))-left+45),height:150}});
        assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'capture.json'),JSON.stringify({source:'current standalone HTML',demoWorlds:['flatland','family','readme-growth'],staging:'controlled time, positions and public labels; no normal saves; no F8 truth view',errors},null,2));
        console.log('Captured explore, relationships, succession and life stages under '+out);
    } finally {if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
