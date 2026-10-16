// Demographic fixture: no player courtship/births or survival-needs simulation.
// Continues the census after founder death, without reviving/replacing anyone.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const files=['core','genetics','characters','registry','navigation','world','social','romance','household','family-invariants','observer-notebooks','family-view','family','renewal','approach','save-format','save-validation','save-migrations','save-codec'];
const context=vm.createContext({});
vm.runInContext(files.map(f=>fs.readFileSync(`src/${f}.js`,'utf8')).join('\n')+'\nglobalThis.rules={World,SaveCodec,captureWorld,hash};',context);
const {World,SaveCodec,captureWorld,hash}=context.rules;
const seeds=Number(process.env.FLATLAND_STUDY_SEEDS || 20),years=Number(process.env.FLATLAND_STUDY_YEARS || 100);
assert.ok(Number.isInteger(seeds)&&seeds>=1&&seeds<=100);assert.ok(Number.isInteger(years)&&years>=1&&years<=150);
const out=path.resolve('output/playwright');fs.mkdirSync(out,{recursive:true});
const start=Number(process.env.FLATLAND_STUDY_START || 0);
const end=Number(process.env.FLATLAND_STUDY_END || seeds),part=process.env.FLATLAND_STUDY_PART;
assert.ok(part===undefined || /^[a-z0-9-]+$/.test(part));
const report=path.join(out,part===undefined?'population-study.json':`population-study-${part}.json`);
const runs=start && part===undefined?JSON.parse(fs.readFileSync(report,'utf8')).runs:[];
assert.ok(Number.isInteger(start)&&Number.isInteger(end)&&start>=0&&start<end&&end<=seeds);
assert.ok(part!==undefined || runs.length===start);
assert.ok(runs.every((run,i)=>run.seed===`renewal-study-${i}` && run.samples.length===years));
const envelope=w=>{const payload=captureWorld(w);return JSON.stringify({format:'the-flatland',version:5,worldVersion:1,savedAt:0,revision:0,payload,checksum:hash(JSON.stringify(payload))});};
function nodes(x) {return 1+(x&&typeof x==='object'?Object.values(x).reduce((n,v)=>n+nodes(v),0):0);}
for(let seed=start;seed<end;seed++) {
    let w=new World(`renewal-study-${seed}`);w.renewal.setEnabled(true);
    const samples=[],failures=[];let firstCohort=null;
    for(let year=1;year<=years;year++) {
        w.elapsed+=120;w.family.age(1);const t=performance.now();w.renewal.evaluateYear(year,{demographic:true});const ms=performance.now()-t;
        const living=w.registry.living(),adults=living.filter(c=>c.actual.life.ageYears>=18&&c.actual.life.ageYears<=60&&!w.romance.spouse(c));
        const eligible={male:0,female:0,preferences:{maleOnly:0,femaleOnly:0,both:0}};let eligiblePairs=0;
        for(const a of adults) {
            if(!adults.some(b=>w.renewal.mutual(a,b))) continue;
            eligible[a.actual.identity.sex]++;
            const pref=w.romance.preferences(a).sexes;eligible.preferences[pref.length===2?'both':pref[0]==='male'?'maleOnly':'femaleOnly']++;
        }
        for(let i=0;i<adults.length;i++) for(let j=i+1;j<adults.length;j++) if(w.renewal.mutual(adults[i],adults[j])) eligiblePairs++;
        const raw=envelope(w),size=Buffer.byteLength(raw),treeNodes=nodes(JSON.parse(raw));
        assert.ok(w.registry.all().length<=256);assert.ok(size<=2_000_000&&treeNodes<80000);
        if(firstCohort===null&&w.family.births.length) firstCohort=year;
        if(w.renewal.lastFailure) failures.push({year,reason:w.renewal.lastFailure});
        samples.push({year,living:living.length,total:w.registry.all().length,deceased:w.registry.all().length-living.length,
            births:w.family.births.length,children:w.family.births.reduce((n,b)=>n+b.childIds.length,0),marriages:w.romance.marriages.length,
            courting:Object.values(w.renewal.pairs).filter(p=>!p.closed&&!w.romance.spouse(w.registry.get(p.ids[0]))).length,
            eligible,eligiblePairs,lineageExtinct:!w.player.actual.life.alive&&!w.family.candidates().length,bytes:size,treeNodes,schedulerMs:ms});
        if(year%10===0) {const restored=SaveCodec.decode(raw).world;assert.deepEqual(JSON.parse(envelope(restored)).payload,JSON.parse(raw).payload);w=restored;}
    }
    const run={seed:w.seed,firstCohort,failures,samples};runs.push(run);
    console.log(`${run.seed}: first cohort ${firstCohort}, final ${samples.at(-1).living} living / ${samples.at(-1).total} records, ${failures.length} deferred evaluations`);
    fs.writeFileSync(report,JSON.stringify({mode:'demographic fixture, continues after player extinction; not human play or indefinite renewal',seeds,years,range:[start,end],runs},null,2));
}
console.log(`PASS ${runs.length} fixed seeds x ${years} years; ten-year exact export/reload checks`);
