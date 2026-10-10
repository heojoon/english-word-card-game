import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
function setup(){
  const messages=[];
  const context=vm.createContext({Date,Set,String,Error,console:{error(){}},
    localMode:true,accountMode:true,selectedCharacter:{id:'one',player:'account',coins:1000},
    demoState:{characters:[{id:'one',player:'account'},{id:'two',player:'account'},{id:'other',player:'other'}],redemptions:[],inventory:[]},
    walletBalance(){return context.selectedCharacter.coins;},isSkin:()=>false,
    saveDemo(){},loadCharacterExtras:async()=>{},closeDialog(){},render(){},toast:m=>messages.push(m),
  });
  vm.runInContext(source.slice(source.indexOf('  function wishPurchaseDay('),source.indexOf('  async function equip(item)')),context);
  return {context,messages,item:{id:7,code:'wish',category:'gift',price:10}};
}
test('wish limit resets at Korean midnight regardless of device timezone',()=>{
  const {context:c}=setup();
  assert.equal(c.wishPurchaseDay('2026-10-10T14:59:59Z'),'2026-10-10');
  assert.equal(c.wishPurchaseDay('2026-10-10T15:00:00Z'),'2026-10-11');
});
test('six purchases across characters succeed; seventh preserves wallet and requests',async()=>{
  const {context:c,item,messages}=setup();
  for(let i=0;i<6;i++){
    c.selectedCharacter.id=i%2?'two':'one';
    await c.purchase(item);
  }
  c.demoState.redemptions[0].status='cancelled';
  await c.purchase(item);
  assert.equal(c.selectedCharacter.coins,940);
  assert.equal(c.demoState.redemptions.length,6);
  assert.match(messages.at(-1),/하루 최대 6장/);
});
test('other accounts, previous days and other rewards do not consume wish quota',async()=>{
  const {context:c,item}=setup();
  c.demoState.redemptions=[
    {character_id:'other',item_id:7,created_at:new Date().toISOString()},
    {character_id:'two',item_id:7,created_at:'2000-01-01T00:00:00Z'},
    {character_id:'one',item_id:8,created_at:new Date().toISOString()},
  ];
  assert.equal(c.localWishPurchaseCount(item),0);
  await c.purchase(item);
  assert.equal(c.localWishPurchaseCount(item),1);
});
test('server limit error is shown without charging the client wallet',async()=>{
  const {context:c,item,messages}=setup();
  c.localMode=false;
  c.rpc=async()=>{throw new Error('wish daily purchase limit');};
  await c.purchase(item);
  assert.equal(c.selectedCharacter.coins,1000);
  assert.match(messages.at(-1),/하루 최대 6장/);
});
