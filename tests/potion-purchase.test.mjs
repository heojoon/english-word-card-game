import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
function setup({local=false,balance=300}={}){
  const c=vm.createContext({potionTypes:{red:{name:'힐링포션',countKey:'red_potion_count'},blue:{name:'마나포션',countKey:'blue_potion_count'}},POTION_PRICE:20,selectedCharacter:{id:'hero',coins:balance},accountMode:!local,localMode:local,accountCrystals:balance,potionInventory:{red_potion_count:2,blue_potion_count:3},demoState:{},document:{querySelectorAll:()=>c.buttons},console:{error(){}},toast:text=>c.message=text,saveDemo(){},closeDialog(){},render(){},loadCharacterExtras:async()=>{},showStoryRecovery:stage=>c.recoveryStage=stage,modal:html=>c.html=html});
  c.buttons=[{dataset:{quantity:'5'},textContent:'5개 구매',disabled:false},{disabled:true}];
  c.walletBalance=()=>local?c.selectedCharacter.coins:c.accountCrystals;
  c.potionCount=type=>c.potionInventory[c.potionTypes[type].countKey];
  vm.runInContext(source.slice(source.indexOf('  function showPotionShopItem('),source.indexOf('  function potionSlotButton(')),c);
  return c;
}
test('shop shows 1/5/10 prices and disables quantities above the balance',()=>{
  const c=setup({balance:100});c.showPotionShopItem('blue');
  assert.match(c.html,/1개 구매 · ◆ 20/);assert.match(c.html,/5개 구매 · ◆ 100/);assert.match(c.html,/10개 구매 · ◆ 200/);
  assert.match(c.html,/data-quantity="10" disabled/);assert.doesNotMatch(c.html,/data-quantity="5" disabled/);
});
test('local purchases charge the exact total for both potion types',async()=>{
  for(const [type,quantity] of [['red',5],['blue',10]]){
    const c=setup({local:true}),button=c.buttons[0];button.dataset.quantity=String(quantity);
    await c.purchasePotion(type,button);
    assert.equal(c.selectedCharacter.coins,300-20*quantity);
    assert.equal(c.demoState.potionInventory.hero[c.potionTypes[type].countKey],(type==='red'?2:3)+quantity);
    assert.match(c.message,new RegExp(`${quantity}개`));
  }
});
test('remote batch uses existing RPC and stops on partial failure with accurate totals',async()=>{
  const c=setup();let calls=0;
  c.rpc=async(name,args)=>{assert.equal(name,'purchase_story_potion');assert.equal(args.p_character_id,'hero');assert.equal(args.p_potion_type,'red');if(++calls===4)throw new Error('not enough crystals');return [{new_balance:300-calls*20,red_potion_count:2+calls,blue_potion_count:3}];};
  await c.purchasePotion('red',c.buttons[0]);
  assert.equal(calls,4);assert.equal(c.accountCrystals,240);assert.equal(c.potionInventory.red_potion_count,5);
  assert.match(c.message,/3개 구매 완료.*나머지 2개/);
});
test('insufficient balance and invalid quantities never send purchase requests',async()=>{
  const c=setup({balance:99});c.rpc=()=>assert.fail('unexpected purchase');
  await c.purchasePotion('red',c.buttons[0]);assert.match(c.message,/부족/);
  c.buttons[0].dataset.quantity='-1';await c.purchasePotion('red',c.buttons[0]);assert.equal(c.accountCrystals,99);
});
test('overlapping quantity buttons send only one batch and unlock after completion',async()=>{
  const c=setup();let release,calls=0;
  c.rpc=async()=>{calls++;if(calls===1)await new Promise(resolve=>release=resolve);return [{new_balance:300-calls*20,red_potion_count:2+calls,blue_potion_count:3}];};
  const pending=c.purchasePotion('red',c.buttons[0]);
  assert.equal(c.buttons[0].disabled,true);
  await c.purchasePotion('blue',{dataset:{quantity:'10'}});assert.equal(calls,1);
  release();await pending;assert.equal(calls,5);assert.equal(c.accountCrystals,200);
  assert.equal(c.buttons[0].disabled,false);assert.equal(c.buttons[1].disabled,true);
});
test('recovery purchase without quantity still buys one and reopens recovery',async()=>{
  const c=setup({local:true}),button=c.buttons[0];button.dataset={recovery:'true',stage:'1-1'};
  await c.purchasePotion('red',button);assert.equal(c.selectedCharacter.coins,280);assert.equal(c.recoveryStage,'1-1');
});
