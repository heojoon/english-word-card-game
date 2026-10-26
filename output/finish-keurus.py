from pathlib import Path
p=Path('supabase/migrations/20261025033858_keurus_midboss_reward.sql')
s=Path('supabase/migrations/20261024061424_20261024163000_red_skull_knight_reward.sql').read_text(encoding='utf-8').replace('stage 30','stage 15').replace('red_skull_knight','keurus').replace('7A장 30','7A장 15').replace('7A장 29','7A장 14').replace('p_correct>180','p_correct>200').replace('330000','300000').replace('then 900','then 400')
a=s.index("  if not exists(select 1 from public.profiles p where p.user_id=v_owner and p.role='admin') then")
b=s.index('  if not exists(select 1 from public.game_scores s',a)
s=s[:a]+s[b:]
p.write_text(s,encoding='utf-8',newline='\n')
p=Path('crystal-game.js');s=p.read_text(encoding='utf-8').replace('    if(run.keurus)return;', '    if(run.keurus){run.result={coins_earned:0};return;}');p.write_text(s,encoding='utf-8',newline='\n')
p=Path('tests/keurus-boss.test.mjs');s=p.read_text(encoding='utf-8').replace("{window:{}, esc:String, deployedAssetUrl:path=>path}","{window:{}, KEURUS_BOSS:{hp:200}, esc:String, deployedAssetUrl:path=>path}").replace("  assert.doesNotMatch(html, /HP undefined/);","  assert.match(html, /HP 200/);\n  assert.match(html, /400 크리스탈/);\n  assert.match(html, /피버타임 없음/);")
s+='''
test('boss creation owns HP, reward, five-minute limit and no fever',()=>{
  const config=source.match(/  const KEURUS_BOSS =[^\\n]+/)[0];
  const create=source.match(/  function createKeurusBoss\\(\\)\\{[^\\n]+/)[0];
  const c=createContext({bossAttackSteps:()=>3});
  new Script(`${config}\\n${create}\\nthis.state=createKeurusBoss();this.reward=KEURUS_BOSS.reward;`).runInContext(c);
  assert.equal(c.state.bossHp,200);assert.equal(c.state.bossMaxHp,200);
  assert.equal(c.state.bossAttackSteps,3);assert.equal(c.state.storyTimeLimit,300000);
  assert.equal(c.state.fever,false);assert.equal(c.reward,400);
});

test('contact applies DMG, clamps HP and ignores paused, exited or finished battles',()=>{
  const fn=source.match(/  function applyKeurusContact\\(battle\\)\\{[\\s\\S]*?\\n  \\}/)[0];
  const battle={bossHp:200,bossAttackSteps:3};let renders=0;const pending=[];
  const c=createContext({run:battle,render:()=>renders++,setTimeout:fn=>pending.push(fn)});
  new Script(`${fn}\\nthis.contact=applyKeurusContact;`).runInContext(c);
  c.contact(battle);assert.equal(battle.bossHp,197);assert.equal(renders,1);
  battle.paused=true;c.contact(battle);assert.equal(battle.bossHp,197);
  battle.paused=false;pending.shift()();assert.equal(battle.bossHp,194);
  battle.bossHp=1;c.contact(battle);assert.equal(battle.bossHp,0);
  battle.done=true;c.contact(battle);assert.equal(renders,3);
  c.run={};c.contact(battle);assert.equal(renders,3);
});

test('Keurus uses HP victory, fixed server reward and bypasses fever and chests',()=>{
  assert.match(source,/if\\(run.keurus&&run.bossHp<=0\\)\\{run.iceTimeActive=false;finishBattle\\(true,'boss-defeated'\\)/);
  assert.match(source,/function beginFeverIntro\\(\\)\\{if\\(!run\\|\\|run.done\\|\\|run.keurus\\)return/);
  assert.match(source,/claim_keurus_reward/);
  assert.match(source,/if\\(run.keurus\\|\\|run.redSkullKnight/);
});
'''
p.write_text(s,encoding='utf-8',newline='\n')
