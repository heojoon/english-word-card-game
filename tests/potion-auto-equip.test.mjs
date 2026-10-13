import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
function setup(slots=[null,null],counts={red:2,blue:2},local=true){
  const c=vm.createContext({potionTypes:{red:{},blue:{}},selectedCharacter:{id:'hero'},localMode:local,potionInventory:{red_potion_count:counts.red,blue_potion_count:counts.blue,equipped_slot_1:slots[0],equipped_slot_2:slots[1]},demoState:{},toast:text=>c.message=text,saveDemo(){},closeDialog(){},render(){},console:{error(){}},loadCharacterExtras:async()=>{}});
  c.equippedPotions=()=>[c.potionInventory.equipped_slot_1,c.potionInventory.equipped_slot_2];
  c.potionCount=type=>c.potionInventory[type+'_potion_count'];
  vm.runInContext(source.slice(source.indexOf('  async function setPotionLoadout('),source.indexOf('  function potionCollectionCard(')),c);
  vm.runInContext(source.slice(source.indexOf('  let potionAutoEquipBusy='),source.indexOf('  function renderGear(')),c);
  return c;
}
test('both potion types fill empty slots immediately, retaining total quantity',async()=>{
  const c=setup();await c.equipPotionToEmptySlot('red',{});assert.equal(c.potionInventory.equipped_slot_1,'red');assert.equal(c.potionInventory.red_potion_count,1);
  await c.equipPotionToEmptySlot('blue',{});assert.equal(c.potionInventory.equipped_slot_2,'blue');assert.equal(c.potionInventory.blue_potion_count,1);
});
test('same potion can fill both slots and existing potion is preserved',async()=>{
  const c=setup(['red',null]);await c.equipPotionToEmptySlot('red',{});assert.deepEqual(c.equippedPotions(),['red','red']);
  const d=setup([null,'blue']);await d.equipPotionToEmptySlot('red',{});assert.deepEqual(d.equippedPotions(),['red','blue']);
});
test('full slots and empty inventory produce feedback without changing loadout',async()=>{
  const c=setup(['red','blue']);await c.equipPotionToEmptySlot('red',{});assert.match(c.message,/모두 차/);assert.equal(c.potionInventory.red_potion_count,2);
  const d=setup([null,null],{red:0,blue:1});await d.equipPotionToEmptySlot('red',{});assert.match(d.message,/포션이 없/);assert.deepEqual(d.equippedPotions(),[null,null]);
});
test('overlapping clicks send one server request and unlock after failure',async()=>{
  const c=setup(['blue',null],{red:2,blue:0},false);let release,calls=0;
  c.rpc=async(name,args)=>{calls++;assert.equal(name,'equip_story_potions');assert.deepEqual(Array.from(args.p_slots),['blue','red']);await new Promise(resolve=>release=resolve);throw new Error('offline');};
  const button={},pending=c.equipPotionToEmptySlot('red',button);await c.equipPotionToEmptySlot('red',{});assert.equal(calls,1);assert.equal(button.disabled,true);release();await pending;assert.equal(button.disabled,false);assert.deepEqual(c.equippedPotions(),['blue',null]);
});
