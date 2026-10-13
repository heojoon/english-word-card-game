import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,existsSync} from 'node:fs';
const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
function setup(accountMode=false){
  const calls=[],state={characters:[],characterTickets:0};
  const c=vm.createContext({run:null,accountMode,guestMode:false,localMode:!accountMode,
    newClass:'sniper',newVariant:'female',player:'tester',characters:[],demoState:state,
    $:()=>({value:'화이트 스나이퍼'}),toast:()=>{},saveDemo:()=>{},closeDialog:()=>{},refresh:async()=>{},go:()=>{},
    localStorage:{setItem:()=>{},getItem:()=>null},characterCreating:true,
    rpc:async(name,args)=>{calls.push({name,args});return {id:'account-sniper'};},console});
  vm.runInContext(source.slice(source.indexOf('  const classDefs ='),source.indexOf('  const builtinWorlds')),c);
  vm.runInContext(source.slice(source.indexOf('  const characterDef ='),source.indexOf('  const portraitSceneClass')),c);
  vm.runInContext(source.slice(source.indexOf('  async function createCharacter('),source.indexOf('  async function buyCharacterTicket(')),c);
  return {c,calls,state};
}
test('guest/demo and account creation retain the sniper class and exact female appearance',async()=>{
  for(const account of [false,true]){
    const {c,calls,state}=setup(account);
    await c.createCharacter({});
    if(account){assert.equal(calls.length,1);assert.equal(calls[0].name,'create_account_character');assert.equal(calls[0].args.p_class,'sniper');assert.equal(calls[0].args.p_avatar_variant,'female');}
    else {assert.equal(state.characters.length,1);assert.equal(state.characters[0].class,'sniper');assert.equal(state.characters[0].avatar_variant,'female');}
  }
});
test('unavailable male artwork cannot create a mismatched sniper',async()=>{
  const {c,calls,state}=setup(true);c.newVariant='male';await c.createCharacter({});
  assert.equal(calls.length,0);assert.equal(state.characters.length,0);
  assert.deepEqual(Array.from(vm.runInContext("availableVariants('sniper')",c)),['female']);
  assert.equal(vm.runInContext("variantOf({class:'sniper',avatar_variant:'male'})",c),'female');
});
test('sniper creation preview offers only available artwork and requested stat bars',()=>{
  const {c}=setup();Object.assign(c,{esc:String,newCharacterName:'화이트 스나이퍼',availableCharacterTickets:0});
  vm.runInContext(source.slice(source.indexOf('  function classStatsMarkup('),source.indexOf('  function characterSelectMarkup(')),c);
  vm.runInContext(source.slice(source.indexOf('  function characterCreatorMarkup('),source.indexOf('  function ',source.indexOf('  function characterCreatorMarkup(')+5)),c);
  const html=c.characterCreatorMarkup();assert.ok(html.includes('sniper-female-upper-body.webp'));assert.ok(!html.includes('data-value="male"'));
  const stats=html.match(/<i>(.*?)<\/i>/g).map(x=>(x.match(/<b>/g)||[]).length);
  assert.deepEqual(stats,[3,2,4,2]);assert.ok(existsSync(new URL('../assets/avatars/variants/sniper-female-upper-body.webp',import.meta.url)));
});
test('sniper battle uses its own female SD animation and never another class strip',()=>{
  const {c}=setup();c.selectedCharacter={class:'sniper',avatar_variant:'female'};
  vm.runInContext(source.slice(source.indexOf('  function battleHeroMarkup('),source.indexOf('  function storyBattleActions(')),c);
  assert.ok(c.battleHeroMarkup().includes('battle-hero-sniper'));assert.ok(!c.battleHeroMarkup().includes('portrait'));
  const manifest=JSON.parse(readFileSync(new URL('../assets/characters/sniper/char_sniper_female_sd_idle_strip.json',import.meta.url),'utf8'));
  assert.equal(manifest.frameCount,2);assert.equal(manifest.frameWidth,512);
});
test('sniper passive slot stays disabled and describes automatic activation',()=>{
  const {c}=setup();Object.assign(c,{selectedCharacter:{class:'sniper'},storySkillDefinitions:[],storySkillIcons:[],
    run:{mp:2,mpMax:2},equippedPotions:()=>[null,null],esc:String,icon:()=>'<svg></svg>'});
  vm.runInContext(source.slice(source.indexOf('  function storyBattleActions('),source.indexOf('  async function useStoryPotion(')),c);
  const html=c.storyBattleActions();assert.ok(html.includes('심안의 저격'));
  assert.ok(!html.includes('연속 베기'));assert.ok(html.includes('15% 확률 · 자동 발동'));assert.ok(!html.includes('data-action="activate-slash"'));
});
