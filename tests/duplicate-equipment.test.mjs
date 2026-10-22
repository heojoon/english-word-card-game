import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
function extract(name){
  const start=source.search(new RegExp(`  (?:async )?function ${name}\\(`));
  const next=source.indexOf('\n  function ',start+1);
  const asyncNext=source.indexOf('\n  async function ',start+1);
  return source.slice(start,Math.min(...[next,asyncNext].filter(n=>n>start)));
}
const boots={id:1,code:'gale_boots',name:'질풍의 장화',category:'avatar',slot:'feet',rarity:'normal',price:100,stat_key:'hp',stat_value:12};
function setup(){
  const character={id:'hero',coins:1000,equipped_items:{feet:1}};
  const state={inventory:[{character_id:'hero',item_id:1}],redemptions:[]};
  const ctx=vm.createContext({selectedCharacter:character,localMode:true,demoState:state,inventory:state.inventory,shopItems:[boots],page:'shop',selectedStage:'story1',stages:{story1:{storyNumber:1}},potionInventory:{},window:{WORDORIA_PETS:{catalog:[]}},rarityNames:{normal:'노말'},itemById:()=>boots,skinEligible:()=>true,skinRequirement:()=>'',isSkin:()=>false,displayRarity:()=> 'normal',equippedMap:()=>character.equipped_items,walletBalance:()=>character.coins,itemOwned:()=>true,itemArt:()=>'<img>',esc:v=>v??'',num:v=>v,saveDemo:()=>{},loadCharacterExtras:async()=>{},closeDialog:()=>{},render:()=>{},toast:()=>{},console,modal:html=>ctx.html=html,characterDef:()=>({stats:{hp:4,mp:1,atk:4,luk:2},growth:{hp:1,mp:1,atk:1,luk:1}})});
  return ctx;
}
test('owned equipment remains purchasable and increases quantity with each debit',async()=>{
  const ctx=setup();vm.runInContext(extract('purchase'),ctx);
  await vm.runInContext('purchase(shopItems[0])',ctx);
  await vm.runInContext('purchase(shopItems[0])',ctx);
  assert.equal(ctx.demoState.inventory.length,3);assert.equal(ctx.selectedCharacter.coins,800);
});
test('shop offers purchase for owned items; gear offers equipment control',()=>{
  const ctx=setup();vm.runInContext(extract('showItem'),ctx);
  vm.runInContext('showItem(1)',ctx);assert.match(ctx.html,/class="primary" data-action="buy"/);
  assert.match(ctx.html,/data-action="equip"/);
  ctx.page='gear';vm.runInContext('showItem(1)',ctx);assert.match(ctx.html,/class="primary" data-action="equip"/);
  ctx.page='shop';ctx.selectedCharacter.coins=0;vm.runInContext('showItem(1)',ctx);
  assert.match(ctx.html,/data-action="buy" data-id="1" disabled/);
});
test('item chest grants a copy even when every eligible item is owned',async()=>{
  const ctx=setup();vm.runInContext(extract('claimStoryItemReward'),ctx);
  const reward=await vm.runInContext('claimStoryItemReward()',ctx);
  assert.equal(reward.item_id,1);assert.equal(ctx.demoState.inventory.length,2);
});
test('duplicate copies display one quantity badge and do not multiply equipped stats',()=>{
  const ctx=setup();ctx.inventory.push({character_id:'hero',item_id:1});
  vm.runInContext(extract('inventoryQuantityMarkup')+extract('renderOwnedItemCard')+extract('combatStats'),ctx);
  const html=vm.runInContext('renderOwnedItemCard(shopItems[0])',ctx);
  assert.match(html,/x2/);assert.equal((html.match(/item-status/g)||[]).length,1);
  const stats=vm.runInContext('combatStats(1)',ctx);assert.equal(stats.bonus.hp,12);assert.equal(stats.equipped,1);
});

for(const chapter of [5,6,7]){
  test(`world ${chapter===7?'6A':chapter} chest can grant normal and special equipment only`,async()=>{
    for(const roll of [0,0.999999]){
      const ctx=setup();ctx.stages.story1={storyChapter:chapter,storyNumber:4};
      ctx.shopItems=[boots,
        {...boots,id:2,rarity:'special'},
        {...boots,id:3,rarity:'rare'},
        {...boots,id:4,rarity:'unique'},
        {...boots,id:5,rarity:'legendary'},
        {...boots,id:6,rarity:'special',slot:'skin'},
        {...boots,id:7,rarity:'special',active:false},
        {...boots,id:8,rarity:'special',category:'gift'}];
      vm.runInContext(`Math.random=()=>${roll};`+extract('claimStoryItemReward'),ctx);
      const reward=await vm.runInContext('claimStoryItemReward()',ctx);
      assert.equal(reward.item_id,roll===0?1:2);
      assert.equal(reward.potion_count,3);
      assert.equal(ctx.demoState.inventory.at(-1).item_id,reward.item_id);
    }
  });
}
test('other world chests keep their existing equipment pool',async()=>{
  for(const chapter of [1,2,3,4,8,9]){
    const ctx=setup();ctx.stages.story1={storyChapter:chapter,storyNumber:4};
    ctx.shopItems=[boots,{...boots,id:2,rarity:'special'},{...boots,id:3,rarity:'unique'}];
    vm.runInContext(extract('claimStoryItemReward'),ctx);
    const reward=await vm.runInContext('claimStoryItemReward()',ctx);
    assert.equal(reward.item_id,3);
  }
});
