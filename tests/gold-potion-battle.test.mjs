import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
const usePotion=source.slice(source.indexOf('  async function useStoryPotion('),source.indexOf('  const ROYAL_SLIME_REWARD='));

test('equipped gold potion fully restores both battle vitals and consumes one slot',async()=>{
  const run={story:true,hp:0,hpMax:3,mp:1,mpMax:4};
  const c=vm.createContext({run,potionInventory:{gold_potion_count:0,equipped_slot_1:'gold',equipped_slot_2:null},potionTypes:{gold:{name:'골드포션'}},selectedCharacter:{id:'hero'},localMode:true,demoState:{},equippedPotions:()=>[c.potionInventory.equipped_slot_1,c.potionInventory.equipped_slot_2],saveDemo(){},persistStoryBattleVitals(){c.saved=[run.hp,run.mp];},render(){},toast:message=>c.message=message,console:{error(){}}});
  vm.runInContext(usePotion,c);
  await c.useStoryPotion(0,{disabled:false});
  assert.deepEqual([run.hp,run.mp],[3,4]);assert.deepEqual(c.saved,[3,4]);
  assert.equal(c.potionInventory.equipped_slot_1,null);
});
