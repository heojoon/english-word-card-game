import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
const sale=source.slice(source.indexOf('  let itemSaleBusy='),source.indexOf('  async function equip('));
const boots={id:1,name:'질풍의 장화',category:'avatar',price:103};
function setup(local=true){
  const character={id:'hero',coins:100,equipped_items:{feet:1},equipped_item_id:1};
  const state={inventory:[{character_id:'hero',item_id:1},{character_id:'hero',item_id:1}],potionInventory:{}};
  const ctx=vm.createContext({selectedCharacter:character,demoState:state,localMode:local,accountMode:!local,accountCrystals:100,potionInventory:{red_potion_count:1,blue_potion_count:0,equipped_slot_1:'red',equipped_slot_2:'blue'},POTION_PRICE:20,potionTypes:{red:{name:'힐링포션',countKey:'red_potion_count'},blue:{name:'마나포션',countKey:'blue_potion_count'}},itemOwned:item=>state.inventory.some(row=>row.character_id==='hero'&&row.item_id===item.id),equippedMap:()=>({...character.equipped_items}),saveDemo(){},loadCharacterExtras:async()=>{},closeDialog(){ctx.closed=true;},render(){},toast:text=>ctx.message=text,console:{error(){}},apiGet:async()=>[],Math});
  ctx.potionCount=type=>ctx.potionInventory[ctx.potionTypes[type].countKey];
  ctx.equippedPotions=()=>[ctx.potionInventory.equipped_slot_1,ctx.potionInventory.equipped_slot_2];
  ctx.storyPotionCount=type=>ctx.potionCount(type)+ctx.equippedPotions().filter(p=>p===type).length;
  vm.runInContext(sale,ctx);return ctx;
}
test('sales consume one copy, credit floor(price/5), preserve duplicate equipment and clear final legacy slot',async()=>{
  const c=setup();await c.sellOwnedItem(boots,null,{});
  assert.equal(c.demoState.inventory.length,1);assert.equal(c.selectedCharacter.coins,120);assert.equal(c.selectedCharacter.equipped_items.feet,1);
  await c.sellOwnedItem(boots,null,{});assert.equal(c.demoState.inventory.length,0);assert.equal(c.selectedCharacter.coins,140);assert.equal(c.selectedCharacter.equipped_items.feet,undefined);assert.equal(c.selectedCharacter.equipped_item_id,null);
  await c.sellOwnedItem(boots,null,{});assert.equal(c.selectedCharacter.coins,140);
});
test('potion sale uses bag first, then removes one equipped potion without healing',async()=>{
  const c=setup();await c.sellOwnedItem(null,'red',{});assert.equal(c.potionInventory.red_potion_count,0);assert.equal(c.potionInventory.equipped_slot_1,'red');assert.equal(c.selectedCharacter.coins,104);
  await c.sellOwnedItem(null,'red',{});assert.equal(c.potionInventory.equipped_slot_1,null);assert.equal(c.potionInventory.equipped_slot_2,'blue');assert.equal(c.selectedCharacter.coins,108);
});
test('remote sale failure preserves wallet and inventory and enables retry',async()=>{
  const c=setup(false),button={};c.rpc=async()=>{throw new Error('failure');};
  await c.sellOwnedItem(boots,null,button);assert.equal(c.accountCrystals,100);assert.equal(c.demoState.inventory.length,2);assert.equal(button.disabled,false);assert.equal(c.closed,undefined);
});
test('busy sale ignores overlapping clicks and uses authoritative server balance',async()=>{
  const c=setup(false);let resolve,calls=0;c.rpc=async(name,args)=>{calls++;assert.equal(name,'sell_owned_item');assert.equal(args.p_item_id,1);return await new Promise(r=>resolve=r);};
  const pending=c.sellOwnedItem(boots,null,{});await c.sellOwnedItem(boots,null,{});assert.equal(calls,1);resolve([{new_balance:120}]);await pending;assert.equal(c.accountCrystals,120);assert.equal(c.closed,true);
});
test('owned-item and potion popups display one-copy sale prices',()=>{
  assert.match(source,/data-action="sell-item"[^>]*>판매하기/);
  assert.match(source,/class="item-sale-price"/);
  assert.match(source,/data-action="sell-potion"/);
});
