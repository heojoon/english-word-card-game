import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
function extract(name){
  const start=source.search(new RegExp(`  (?:async )?function ${name}\\(`));
  assert.ok(start>=0,name);
  const ends=[source.indexOf('\n  function ',start+1),source.indexOf('\n  async function ',start+1),source.indexOf('\n  document.addEventListener',start+1)].filter(n=>n>start);
  return source.slice(start,Math.min(...ends));
}
function setup(){
  const elements={'notice-status':{},'notice-character':{value:'hero'}};
  const ctx=vm.createContext({noticeQueue:[{id:'n',kind:'event',title:'<script>',body:'hello\n<unsafe>',rewards:[{item_id:1,name:'비밀 이름',quantity:3}]}],activeNotice:null,noticeBusy:false,characters:[{id:'hero',name:'<hero>'}],selectedCharacter:{id:'hero'},noticeKinds:{event:'이벤트'},accountMode:true,
    $:id=>elements[id],document:{querySelectorAll:()=>[]},esc:v=>String(v??'').replaceAll('<','&lt;').replaceAll('>','&gt;'),num:String,
    noticeRewardArt:()=>'<img alt="item">',modal:(html,options)=>{ctx.html=html;ctx.options=options;},closeDialog:()=>ctx.closed=true,
    rpc:async(name,args)=>{ctx.calls.push({name,args});},calls:[],toast:message=>ctx.toast=message,render:()=>ctx.rendered=true,loadCharacterExtras:async()=>{},console});
  vm.runInContext(extract('showNextNotice')+extract('finishNotice')+extract('loadLoginNotices'),ctx);
  return ctx;
}
test('login notice escapes content, preserves newlines and uses compact art without visible item names',()=>{
  const ctx=setup();vm.runInContext('showNextNotice()',ctx);
  assert.match(ctx.html,/&lt;script&gt;/);assert.match(ctx.html,/hello\n&lt;unsafe&gt;/);
  assert.doesNotMatch(ctx.html,/비밀 이름/);assert.match(ctx.html,/×3/);assert.equal(ctx.options.closable,false);
  assert.match(ctx.html,/notice-claim/);assert.match(ctx.html,/notice-dismiss/);
});
test('claim uses the selected owned character and advances only after the server succeeds',async()=>{
  const ctx=setup();vm.runInContext('showNextNotice()',ctx);
  await vm.runInContext('finishNotice(true)',ctx);
  assert.equal(ctx.calls[0].name,'claim_game_notice');assert.equal(ctx.calls[0].args.p_character_id,'hero');
  assert.equal(ctx.noticeQueue.length,0);assert.equal(ctx.closed,true);assert.equal(ctx.rendered,true);
});
test('dismiss is persisted and the next pending notice is displayed',async()=>{
  const ctx=setup();ctx.noticeQueue.push({id:'next',kind:'event',title:'next title',body:'body',rewards:[]});
  vm.runInContext('showNextNotice()',ctx);await vm.runInContext('finishNotice()',ctx);
  assert.equal(ctx.calls[0].name,'dismiss_game_notice');assert.equal(ctx.activeNotice.id,'next');
  assert.match(ctx.html,/next title/);assert.doesNotMatch(ctx.html,/notice-claim/);
});
test('failed dismissal keeps the notice open for retry',async()=>{
  const ctx=setup();ctx.rpc=async()=>{throw new Error('offline');};vm.runInContext('showNextNotice()',ctx);
  await vm.runInContext('finishNotice()',ctx);
  assert.equal(ctx.noticeQueue.length,1);assert.equal(ctx.activeNotice.id,'n');assert.equal(ctx.noticeBusy,false);assert.notEqual(ctx.closed,true);
});
test('rapid double click issues a single claim RPC',async()=>{
  const ctx=setup();let complete;ctx.rpc=()=>new Promise(resolve=>{complete=resolve;});
  vm.runInContext('showNextNotice()',ctx);const first=vm.runInContext('finishNotice(true)',ctx);
  assert.equal(ctx.noticeBusy,true);await vm.runInContext('finishNotice(true)',ctx);complete();await first;
  assert.equal(ctx.noticeQueue.length,0);
});
test('accounts without a character can create one before receiving attachments',()=>{
  const ctx=setup();ctx.characters=[];vm.runInContext('showNextNotice()',ctx);
  assert.match(ctx.html,/notice-create-character/);assert.doesNotMatch(ctx.html,/data-action="notice-claim"/);
});
test('guest sessions never request account notices',async()=>{
  const ctx=setup();ctx.accountMode=false;await vm.runInContext('loadLoginNotices()',ctx);assert.equal(ctx.calls.length,0);
});
function composerSetup(){
  const button={disabled:false},status={},controls=[button,{}];
  const form={values:{title:' 제목 ',body:' 본문 ',kind:'notice',audience:'selected',reward:['1','blue']},querySelector:selector=>selector==='[type=submit]'?button:{value:selector.includes('blue')?'3':'2'},querySelectorAll:()=>controls,reportValidity:()=>true};
  const ctx=vm.createContext({noticePendingPayload:null,noticeRequestId:'stable-id',noticeRecipients:new Map([['user-a','가'],['user-b','나']]),
    FormData:class {constructor(form){this.values=form.values;}get(key){return this.values[key];}getAll(key){return this.values[key]||[];}},
    $:()=>status,rpc:async(name,args)=>{ctx.calls.push({name,args});return 2;},calls:[],num:String,modal:html=>ctx.html=html});
  vm.runInContext(extract('sendNotice'),ctx);ctx.form=form;ctx.button=button;ctx.status=status;return ctx;
}
test('composer sends multiple recipients, typed item quantities, trimmed title/body and a stable request ID',async()=>{
  const ctx=composerSetup();await vm.runInContext('sendNotice(form)',ctx);
  const {name,args}=ctx.calls[0];assert.equal(name,'send_game_notice');
  assert.equal(args.p_request_id,'stable-id');assert.equal(args.p_title,'제목');assert.equal(args.p_body,'본문');
  assert.deepEqual(Array.from(args.p_user_ids),['user-a','user-b']);
  assert.equal(args.p_rewards[0].item_id,1);assert.equal(args.p_rewards[0].quantity,2);
  assert.equal(args.p_rewards[1].potion_type,'blue');assert.equal(args.p_rewards[1].quantity,3);
  assert.match(ctx.html,/2개 계정/);
});
test('composer rejects an empty target selection or whitespace-only content without calling the server',async()=>{
  const ctx=composerSetup();ctx.noticeRecipients.clear();await vm.runInContext('sendNotice(form)',ctx);assert.equal(ctx.calls.length,0);
  ctx.noticeRecipients.set('a','a');ctx.form.values.title='   ';await vm.runInContext('sendNotice(form)',ctx);assert.equal(ctx.calls.length,0);
});
test('an ambiguous send failure retries the exact same payload even when disabled form fields are absent',async()=>{
  const ctx=composerSetup();let failed=true;
  ctx.rpc=async(name,args)=>{ctx.calls.push({name,args});if(failed)throw new Error('timeout');return 2;};
  await vm.runInContext('sendNotice(form)',ctx);assert.equal(ctx.button.disabled,false);
  const first=ctx.calls[0].args;ctx.form.values={};failed=false;
  await vm.runInContext('sendNotice(form)',ctx);assert.equal(ctx.calls[1].args,first);assert.equal(ctx.calls[1].args.p_request_id,'stable-id');
});
test('crystal gift is available with existing crystal art and sends a currency reward',async()=>{
  const ctx=composerSetup();ctx.shopItems=[];ctx.itemArt=item=>item.art_path;
  vm.runInContext(extract('noticeItemChoices')+extract('noticeRewardArt'),ctx);
  assert.equal(vm.runInContext('noticeItemChoices()[0].currency',ctx),'crystals');
  assert.match(vm.runInContext("noticeRewardArt({currency:'crystals'})",ctx),/ui_reward_crystal_bloom.webp/);
  ctx.form.values.reward=['crystals'];await vm.runInContext('sendNotice(form)',ctx);
  assert.equal(ctx.calls[0].args.p_rewards[0].currency,'crystals');
  assert.equal(ctx.calls[0].args.p_rewards[0].item_id,undefined);
});
test('crystal-only gift can be claimed without a character and refreshes the account wallet',async()=>{
  const ctx=setup();ctx.characters=[];ctx.$=id=>id==='notice-status'?{}:null;
  ctx.noticeQueue[0].rewards=[{currency:'crystals',quantity:300}];
  ctx.loadAccountProfile=async()=>({crystal_balance:450});
  vm.runInContext('showNextNotice()',ctx);
  assert.match(ctx.html,/data-action="notice-claim"/);assert.doesNotMatch(ctx.html,/notice-create-character|notice-character-label/);
  await vm.runInContext('finishNotice(true)',ctx);
  assert.equal(ctx.calls[0].args.p_character_id,null);assert.equal(ctx.accountCrystals,450);assert.equal(ctx.noticeQueue.length,0);
});
test('mixed crystal and equipment gifts still require a character',async()=>{
  const ctx=setup();ctx.characters=[];ctx.$=()=>null;
  ctx.noticeQueue[0].rewards.push({currency:'crystals',quantity:300});
  vm.runInContext('showNextNotice()',ctx);assert.match(ctx.html,/notice-create-character/);
  await vm.runInContext('finishNotice(true)',ctx);assert.equal(ctx.calls.length,0);
});
