import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';

const root=new URL('../',import.meta.url),c=vm.createContext({window:{}});
for(const file of ['pet-system.js','guardian-boss.js','black-dragon-boss.js'])vm.runInContext(readFileSync(new URL(file,root),'utf8'),c);
const {catalog,attach}=c.window.WORDORIA_PETS;
function battle(index,roll=0){
  const state={story:true,hp:2,hpMax:4,mp:0,mpMax:2};let rolls=0;
  state.petEffects=attach(state,catalog[index],{random:()=>{rolls++;return roll;}});
  return {state,effect:state.petEffects,rolls:()=>rolls};
}

test('the eleven pets preserve unique codes, approved prices, LUK and available artwork',()=>{
  assert.equal(new Set(catalog.map(p=>p.code)).size,11);
  assert.deepEqual(Array.from(catalog,p=>p.price),[220,660,770,880,990,1500,2000,2500,3000,4000,1500]);
  assert.deepEqual(Array.from(catalog,p=>p.stat_value),[5,7,8,10,12,14,16,18,21,25,12]);
  for(const pet of catalog){assert.equal(pet.slot,'pet');assert.equal(pet.stat_key,'luk');assert.ok(existsSync(new URL(pet.art_path,root)));if(pet.code!=='pet')assert.equal(readFileSync(new URL(pet.art_path,root))[25],6);}
  assert.deepEqual(Array.from(catalog,p=>p.rarity),[...Array(8).fill('unique'),'legendary','legendary','legendary']);
  assert.deepEqual(Array.from(catalog,p=>p.stars),[...Array(8).fill(4),5,5,5]);
});

test('6% and 10% boundaries fail at the exact limit; healing clamps and skips full resources',()=>{
  for(const [i,key] of [[2,'mp'],[3,'hp'],[7,'mp'],[8,'hp']]){
    const {state,effect,rolls}=battle(i,catalog[i].chance);assert.equal(effect.onCorrect(),false);assert.equal(rolls(),1);
    const hit=battle(i,catalog[i].chance-.00001);assert.equal(hit.effect.onCorrect(),true);assert.equal(hit.state[key],state[key]+1);
    hit.state[key]=hit.state[key+'Max'];const before=hit.rolls();assert.equal(hit.effect.onCorrect(),false);assert.equal(hit.rolls(),before);
  }
});

test('spirit reveals one unmatched pair at 8%, does not answer automatically and clears on transition',()=>{
  for(const roll of [.07999,.08]){
    const {state,effect,rolls}=battle(10,roll);
    Object.assign(state,{index:0,correct:0,matchEn:[{id:2},{id:0},{id:1}],matched:new Set([2])});
    assert.equal(effect.onQuestion(),roll<.08);
    assert.equal(state.petHint?.pairId,roll<.08?0:undefined);
    assert.equal(state.correct,0);assert.equal(state.matched.size,1);
    assert.equal(effect.onCorrect(),false);assert.equal(rolls(),1);
    state.matchEn=[];assert.equal(effect.onQuestion(),false);assert.equal(state.petHint,null);
    effect.clear();assert.equal(state.petHint,null);
  }
});

test('spirit marks only the current correct choice and both sides of one pair',()=>{
  const {state,effect}=battle(10);
  state.guardian=true;state.question={answer:'apple'};
  assert.equal(effect.onQuestion(),true);
  const source=readFileSync(new URL('crystal-game.js',root),'utf8'),runtime=vm.createContext({run:state});
  vm.runInContext(source.slice(source.indexOf('  function petAnswerHintMarkup('),source.indexOf('  function petBattleMarkup(')),runtime);
  assert.match(runtime.petAnswerHintMarkup('apple'),/정령의 정답/);
  assert.equal(runtime.petAnswerHintMarkup('pear'),'');
  state.question={answer:'pear'};assert.equal(runtime.petAnswerHintMarkup('pear'),'');
  effect.onQuestion();assert.match(runtime.petAnswerHintMarkup('pear'),/정령의 정답/);
  state.guardian=false;state.matchEn=[{id:7},{id:8}];state.matched=new Set();effect.onQuestion();
  assert.match(runtime.petPairHintMarkup(7),/정령의 정답/);assert.equal(runtime.petPairHintMarkup(8),'');
  state.matched.add(7);assert.equal(runtime.petPairHintMarkup(7),'');
  state.fever=true;assert.equal(effect.onQuestion(),false);assert.equal(state.petHint,null);
});

test('ordinary Story and every boss prepare the spirit hint before displaying a new question board',()=>{
  const source=readFileSync(new URL('crystal-game.js',root),'utf8');
  for(const mode of ['story','boss','crystalGhost','guardian','blackDragon']){
    const {state,effect}=battle(10);
    Object.assign(state,{index:0,deck:Array.from({length:5},(_,i)=>({entry:[`word${i}`,'명',`뜻${i}`],mode:'en-ko'})),guardian:['guardian','blackDragon'].includes(mode),boss:['boss','crystalGhost'].includes(mode),crystalGhost:mode==='crystalGhost',blackDragon:mode==='blackDragon'});
    const runtime=vm.createContext({run:state,selectedCharacter:{class:'warrior'},selectedStage:'stage',stages:{stage:{words:[]}},STORY_QUESTIONS_PER_TURN:5,performance:{now:()=>0},shuffle:rows=>rows,activatePassive(){},makeQuestion:entry=>({entry,answer:entry[0],choices:[entry[0],'other']})});
    vm.runInContext(source.slice(source.indexOf('  function prepareQuestion('),source.indexOf('  function initializeBattlePet(')),runtime);
    vm.runInContext(source.slice(source.indexOf('  function prepareRoyalSlimeBoard('),source.indexOf('  function royalSlimeRemaining(')),runtime);
    runtime.prepareQuestion();
    assert.ok(state.petHint,mode);
    if(state.guardian)assert.equal(state.petHint.question,state.question);else assert.equal(state.petHint.pairId,0);
    effect.clear();assert.equal(state.petHint,null);
  }
});

test('a shield absorbs exactly one damage packet, including lethal boss damage, without stacking',()=>{
  for(const index of [0,5,6]){const {state,effect,rolls}=battle(index);assert.equal(effect.onCorrect(),true);assert.equal(effect.onCorrect(),false);assert.equal(rolls(),1);effect.damage(10);assert.equal(state.hp,2);assert.equal(state.petShield,false);effect.damage(1);assert.equal(state.hp,1);}
});

test('time freezes exactly three seconds, resumes with overflow, cannot stack, and pauses with the game',()=>{
  for(const index of [1,4]){const {state,effect}=battle(index);effect.onCorrect();assert.equal(effect.onCorrect(),false);assert.equal(effect.advance(1200),0);state.paused=true;assert.equal(effect.advance(10000),0);assert.equal(state.petTimeMs,1800);state.paused=false;assert.equal(effect.advance(2000),200);assert.equal(state.petTimeMs,0);assert.equal(effect.advance(33),33);assert.equal(effect.onCorrect(),true);}
});

test('dragon heart checks only lethal damage and permits one successful revival per battle',()=>{
  const {state,effect,rolls}=battle(9);assert.equal(effect.onCorrect(),false);assert.equal(rolls(),0);effect.damage(1);assert.equal(rolls(),0);effect.damage(1);assert.equal(state.hp,1);assert.equal(state.petRevived,true);effect.damage(1);assert.equal(state.hp,0);assert.equal(rolls(),1);
  const miss=battle(9,.10);miss.effect.damage(20);assert.equal(miss.state.hp,0);assert.equal(miss.state.petRevived,false);
});

test('Survival, fever, completed battles and unrelated or legacy pets do not receive skills',()=>{
  assert.equal(attach({story:false},catalog[0]),null);assert.equal(attach({story:true},{code:'unknown_pet'}),null);
  for(const key of ['done','fever','feverTransition']){const {state,effect,rolls}=battle(0);effect.onCorrect();state[key]=true;assert.equal(effect.onCorrect(),false);effect.clear();assert.equal(state.petShield,false);assert.equal(state.petTimeMs,0);assert.equal(rolls(),1);}
});

test('guardian and dragon wrong answers use pet shield and revival before defeat is decided',()=>{
  for(const rules of [c.window.WORDORIA_GUARDIAN,c.window.WORDORIA_BLACK_DRAGON]){
    const shield=battle(6);Object.assign(shield.state,rules.reset(),{correct:0,index:0});shield.effect.onCorrect();rules.answer(shield.state,false,100);assert.equal(shield.state.hp,2);assert.ok(!rules.advance(shield.state,500).includes('defeat-player'));
    const dragon=battle(9);Object.assign(dragon.state,rules.reset(),{hp:1,correct:0,index:0});rules.answer(dragon.state,false,100);assert.equal(dragon.state.hp,1);assert.ok(!rules.advance(dragon.state,500).includes('defeat-player'));
  }
});

test('black dragon energy drain also consumes a prepared pet shield at contact',()=>{
  const {state,effect}=battle(6);Object.assign(state,c.window.WORDORIA_BLACK_DRAGON.reset(),{correct:12,index:12,bossHp:49});effect.onCorrect();c.window.WORDORIA_BLACK_DRAGON.answer(state,true,100);c.window.WORDORIA_BLACK_DRAGON.advance(state,1000,()=>0);assert.equal(state.hp,2);assert.equal(state.petShield,false);assert.equal(state.drainSuccess,false);
});

test('runtime attaches only an owned equipped pet and resets effects on a fresh battle',()=>{
  const source=readFileSync(new URL('crystal-game.js',root),'utf8'),runtime=vm.createContext({run:{story:true,hp:2,hpMax:4,mp:1,mpMax:2},window:c.window,equippedMap:()=>({pet:1}),itemById:()=>({...catalog[0],id:1}),itemOwned:()=>false,document:{dispatchEvent(){}},CustomEvent:class{}});
  vm.runInContext(source.slice(source.indexOf('  function initializeBattlePet('),source.indexOf('  function petBattleMarkup(')),runtime);
  runtime.initializeBattlePet();assert.equal(runtime.run.petEffects,undefined);runtime.itemOwned=()=>true;runtime.initializeBattlePet();assert.equal(runtime.run.petEffects.pet.code,catalog[0].code);runtime.run.petShield=true;runtime.initializeBattlePet();assert.equal(runtime.run.petShield,false);
});

test('guest pet purchases use the declared price and retain inventory without duplicate charges',async()=>{
  const source=readFileSync(new URL('crystal-game.js',root),'utf8'),inventory=[];
  const state={localMode:true,selectedCharacter:{id:'guest-hero',coins:1000},demoState:{inventory},walletBalance:()=>state.selectedCharacter.coins,isSkin:()=>false,itemOwned:item=>inventory.some(row=>row.item_id===item.id),saveDemo(){},loadCharacterExtras:async()=>{},closeDialog(){},render(){},toast(){},console};
  const runtime=vm.createContext(state);
  vm.runInContext(source.slice(source.indexOf('  async function purchase('),source.indexOf('  async function equip(')),runtime);
  const pet={...catalog[0],id:'local-pet_pebble_slime'};
  await runtime.purchase(pet);assert.equal(state.selectedCharacter.coins,780);assert.equal(inventory.length,1);assert.equal(inventory[0].character_id,'guest-hero');
  await runtime.purchase(pet);assert.equal(state.selectedCharacter.coins,780);assert.equal(inventory.length,1);
  await runtime.purchase({...catalog[9],id:'local-pet_prism_guardian_dragon'});assert.equal(state.selectedCharacter.coins,780);assert.equal(inventory.length,1);
});

test('equipped pets add their declared LUK points to character stats',()=>{
  const source=readFileSync(new URL('crystal-game.js',root),'utf8');
  for(const pet of catalog){
    const runtime=vm.createContext({selectedCharacter:{class:'warrior',id:'hero'},stats:()=>({level:1}),equippedMap:()=>({pet:pet.code}),itemById:()=>pet});
    vm.runInContext(source.slice(source.indexOf('  const classDefs ='),source.indexOf('  const builtinWorlds')),runtime);
    vm.runInContext('function characterDef(c){return classDefs[c.class];}',runtime);
    vm.runInContext(source.slice(source.indexOf('  function combatStats('),source.indexOf('  function stageRecordName(')),runtime);
    assert.equal(runtime.combatStats(1).luk,100+pet.stat_value);
  }
});

test('the main timer freezes for pets on ordinary Story, slime and guardian boss paths',()=>{
  const source=readFileSync(new URL('crystal-game.js',root),'utf8');
  for(const mode of ['story','boss','guardian']){
    let now=0,callback;const {state,effect}=battle(1);Object.assign(state,{elapsed:0,storyTimeLimit:30000,mobs:[],last:0,[mode]:true});effect.onCorrect();
    const runtime=vm.createContext({run:state,timerId:0,performance:{now:()=>now},clearInterval(){},setInterval:fn=>{callback=fn;return 1;},updateEnemyApproach(){},updateWarriorSlash(){},updateRoyalSlimeClock(){},advanceGuardianBattle:(delta,clock)=>{state.elapsed+=clock;},document:{querySelector:()=>null},$:()=>null});
    vm.runInContext(source.slice(source.indexOf('  function tick()'),source.indexOf('  function pause()')),runtime);runtime.tick();now=2000;callback();assert.equal(state.elapsed,0);now=3500;callback();assert.equal(state.elapsed,500);
  }
});
