import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
function setup(rpc=async()=>[]){
  const panel={outerHTML:''};
  const context=vm.createContext({rpc,page:'home',demo:false,localMode:false,Date,
    num:n=>String(n),esc:s=>String(s).replaceAll('<','&lt;').replaceAll('>','&gt;'),
    document:{querySelector:()=>panel}});
  vm.runInContext(source.slice(source.indexOf('  let hallOfFameRows='),source.indexOf('  function renderHome()')),context);
  return {context,panel};
}
test('podium shows SD appearance and switches between lifetime and weekly categories',async()=>{
  const {context:c,panel}=setup(async()=>[
    {category:'level',rank:1,player_name:'heojoon',character_name:'<img>',value:35,character_class:'mage',avatar_variant:'female',skin_code:'mage_starlight_rose_skin'},
    {category:'story',rank:1,player_name:'heojoon',character_name:'얼음공주',value:30,character_class:'mage',avatar_variant:'female'},
    {category:'survival',rank:1,player_name:'heojoon',character_name:'얼음공주',value:20,character_class:'mage',avatar_variant:'female'}
  ]);
  await c.loadHallOfFame();
  assert.match(panel.outerHTML,/heojoon의<\/small><b>&lt;img&gt;<\/b>/);
  assert.match(panel.outerHTML,/battle-hero-mage battle-hero-female battle-skin-mage_starlight_rose_skin/);
  assert.match(panel.outerHTML,/LV.35/);
  assert.equal((panel.outerHTML.match(/다음 주인공은/g)||[]).length,2);
  vm.runInContext("hallOfFameCategory='story'",c);
  assert.match(c.hallOfFameMarkup(),/30곳/);
  vm.runInContext("hallOfFameCategory='survival'",c);
  assert.match(c.hallOfFameMarkup(),/20회/);
  assert.match(c.hallOfFameMarkup(),/주간 누적 클리어 · 월~일 · 한국시간/);
});
test('appearance whitelist matches exact class and gender and rejects arbitrary CSS classes',()=>{
  const {context:c}=setup();
  for(const heroClass of ['warrior','mage','pugilist','ranger']){
    for(const variant of ['male','female']){
      const html=c.hallOfFameHeroMarkup({character_class:heroClass,avatar_variant:variant,skin_code:'bad" onclick="evil'});
      assert.ok(html.includes(`battle-hero-${heroClass} battle-hero-${variant}`));
      assert.doesNotMatch(html,/evil|battle-skin/);
    }
  }
  assert.doesNotMatch(c.hallOfFameHeroMarkup({character_class:'mage',avatar_variant:'female',skin_code:'mage_arcane_necromancer_skin'}),/battle-skin/);
  assert.match(c.hallOfFameHeroMarkup({character_class:'sniper',avatar_variant:'female',skin_code:'sniper_snow_crystal_skin'}),/battle-skin-sniper_snow_crystal_skin/);
  assert.doesNotMatch(c.hallOfFameHeroMarkup({character_class:'sniper',avatar_variant:'male'}),/battle-hero/);
});
test('concurrent renders reuse a request; explicit refresh bypasses the cache',async()=>{
  let calls=0,resolve;
  const {context:c}=setup(()=>{calls++;return new Promise(r=>resolve=r);});
  const pending=c.loadHallOfFame();
  await c.loadHallOfFame();assert.equal(calls,1);
  resolve([]);await pending;
  await c.loadHallOfFame();assert.equal(calls,1);
  const refreshed=c.loadHallOfFame(true);assert.equal(calls,2);resolve([]);await refreshed;
});
test('a failed request shows retry feedback and can recover',async()=>{
  let fail=true;
  const {context:c,panel}=setup(async()=>{if(fail)throw Error('offline');return [];});
  await c.loadHallOfFame();assert.match(panel.outerHTML,/기록을 불러오지 못했어요/);
  fail=false;await c.loadHallOfFame(true);
  assert.doesNotMatch(panel.outerHTML,/기록을 불러오지 못했어요/);
});
test('completion after navigating away does not replace another screen',async()=>{
  let resolve;
  const {context:c,panel}=setup(()=>new Promise(r=>resolve=r));
  const pending=c.loadHallOfFame();c.page='battle';panel.outerHTML='battle';
  resolve([]);await pending;assert.equal(panel.outerHTML,'battle');
});
