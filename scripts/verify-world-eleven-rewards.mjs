import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const path = 'supabase/migrations/';
const name = readdirSync(path).find(file => /_world_eleven\.sql$/.test(file));
assert.ok(name, 'World 11 account migration must exist');
const sql = readFileSync(path + name, 'utf8');
for (const contract of [
  'claim_world_eleven_boss_result', 'p_boss_hp is distinct from 0',
  'previous stage clear required', 'auth.uid() is distinct from v_owner',
  'for update', 'v_story_replay', 'question_reward', 'combo_bonus',
  'stage_clear_bonus', 'world eleven bosses require dedicated claim',
  '스토리 10장 40 · 별빛이 끊긴 관측탑', 'private.story_clear_position',
]) assert.ok(sql.includes(contract), `Missing account contract: ${contract}`);
assert.ok(!sql.includes("'world_eleven_reward'"), 'No special fixed payout');
assert.match(sql, /revoke all on function public\.claim_world_eleven_boss_result[\s\S]*from public,anon/);
export const regressionSql = String.raw`
do $test$
declare
  u uuid:=gen_random_uuid(); other_u uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); c2 uuid:=gen_random_uuid();
  r record; r2 record; i integer; before_balance integer; after_balance integer; chest record;
  stage text; boss22 text:='스토리 11장 22 · 낙성 요새의 마지막 수송';
  boss44 text:='스토리 11장 44 · 낙성 요새의 마지막 수송';
begin
  insert into auth.users(id,email,raw_user_meta_data) values
    (u,'world11-'||u||'@example.invalid','{"display_name":"월드검증"}'),
    (other_u,'world11-'||other_u||'@example.invalid','{"display_name":"월드검증이"}');
  insert into public.game_characters(id,player,name,class,owner_user_id)
    values(c,'월드검증','월드검증','warrior',u),(c2,'월드검증이','월드검증이','pugilist',u);
  perform set_config('request.jwt.claim.sub',u::text,true);
  begin
    perform public.award_game_result(c,'스토리 11장 1 · 낙성 요새의 마지막 수송',30,30,true,100000);
    raise exception 'TEST: missing prerequisite accepted';
  exception when others then if sqlerrm<>'previous stage clear required' then raise; end if; end;
  insert into public.game_scores(player,stage,correct,total,cleared,character_id,duration_ms)
    values('월드검증','스토리 10장 40 · 별빛이 끊긴 관측탑',1,1,true,c,1000);
  for i in 1..21 loop
    stage:='스토리 11장 '||i||' · 낙성 요새의 마지막 수송';
    select * into r from public.award_game_result(c,stage,30,30,true,180000,0,10);
    if r.coins_earned<>56 then raise exception 'TEST: ordinary fever reward mismatch'; end if;
    if not exists(select 1 from public.coin_ledger where game_score_id=r.game_score_id and reason='fever_bonus' and amount=10) then
      raise exception 'TEST: fever ledger missing'; end if;
  end loop;
  select * into r from public.award_game_result(c,boss22,35,40,false,100000);
  if r.coins_earned<>42 then raise exception 'TEST: failed boss standard reward mismatch'; end if;
  begin
    perform public.claim_world_eleven_boss_result(c,boss44,1,100000,0);
    raise exception 'TEST: skipped boss prerequisite accepted';
  exception when others then if sqlerrm<>'previous stage clear required' then raise; end if; end;
  begin
    perform public.award_game_result(c,boss22,35,40,false,100000,1);
    raise exception 'TEST: boss slash payout accepted';
  exception when others then if sqlerrm<>'world eleven boss has no slash payout' then raise; end if; end;
  select * into r from public.award_game_result(c2,'스토리 11장 21 · 낙성 요새의 마지막 수송',30,30,true,180000,0,10);
  if r.coins_earned<>0 then raise exception 'TEST: account replay fever paid'; end if;
  begin
    perform public.award_game_result(c,boss22,30,30,true,100000,0,1);
    raise exception 'TEST: boss fever payout accepted';
  exception when others then if sqlerrm<>'world eleven boss has no fever payout' then raise; end if; end;
  begin
    perform public.award_game_result(c,'스토리 11장 21 · 낙성 요새의 마지막 수송',30,30,true,180000,0,165);
    raise exception 'TEST: excessive fever accepted';
  exception when others then if sqlerrm<>'fever bonus exceeds spawn limit' then raise; end if; end;
  begin
    perform public.award_game_result(c,'스토리 11장 21 · 낙성 요새의 마지막 수송',30,30,false,100000,0,1);
    raise exception 'TEST: failed fever accepted';
  exception when others then if sqlerrm<>'world eleven fever requires clear' then raise; end if; end;
  begin
    perform public.award_game_result(c,boss22,30,30,true,100000);
    raise exception 'TEST: generic boss clear accepted';
  exception when others then if sqlerrm<>'world eleven bosses require dedicated claim' then raise; end if; end;
  begin
    perform public.record_game_result_without_reward(c,boss22,30,30,true,100000);
    raise exception 'TEST: record-only boss clear accepted';
  exception when others then if sqlerrm<>'world eleven bosses require dedicated claim' then raise; end if; end;
  begin
    perform public.claim_world_eleven_boss_result(c,boss22,83,100000,1);
    raise exception 'TEST: living boss accepted';
  exception when others then if sqlerrm<>'invalid world eleven boss clear' then raise; end if; end;
  perform set_config('request.jwt.claim.sub',other_u::text,true);
  begin
    perform public.claim_world_eleven_boss_result(c,boss22,83,100000,0);
    raise exception 'TEST: foreign owner accepted';
  exception when others then if sqlerrm<>'character not found' then raise; end if; end;
  perform set_config('request.jwt.claim.sub',u::text,true);
  select crystal_balance into before_balance from public.profiles where user_id=u;
  select * into r from public.claim_world_eleven_boss_result(c,boss22,83,100000,0);
  if r.coins_earned<>109 or r.balance<>before_balance+109 then raise exception 'TEST: variable boss reward mismatch'; end if;
  if not exists(select 1 from public.game_scores where id=r.game_score_id and correct=83 and total=83 and cleared) then
    raise exception 'TEST: actual answer count lost'; end if;
  if (select sum(amount) from public.coin_ledger where game_score_id=r.game_score_id)<>109 then
    raise exception 'TEST: ledger mismatch'; end if;
  select * into chest from public.claim_stage_treasure(c,r.game_score_id);
  if chest.reward not between 30 and 50 then raise exception 'TEST: standard treasure mismatch'; end if;
  perform public.claim_story_item_treasure(c,r.game_score_id);
  update public.profiles set learning_level='elementary' where user_id=u;
  select * into r2 from public.claim_world_eleven_boss_result(c2,boss22,83,90000,0);
  if r2.coins_earned<>0 or not r2.personal_best then raise exception 'TEST: account/level replay mismatch'; end if;
  select * into chest from public.claim_stage_treasure(c2,r2.game_score_id);
  if chest.reward<>0 then raise exception 'TEST: replay chest paid'; end if;
  select * into chest from public.claim_story_item_treasure(c2,r2.game_score_id);
  if chest.item_id is not null or chest.potion_count<>0 then raise exception 'TEST: replay items paid'; end if;
  for i in 23..43 loop
    perform public.award_game_result(c,'스토리 11장 '||i||' · 낙성 요새의 마지막 수송',30,30,true,100000);
  end loop;
  select * into r from public.claim_world_eleven_boss_result(c,boss44,0,100000,0);
  if r.coins_earned<>10 then raise exception 'TEST: zero-answer skill victory mismatch'; end if;
  select * into r from public.award_game_result(c,boss44,35,40,false,100000);
  if r.coins_earned<>0 then raise exception 'TEST: cleared boss defeat replay paid'; end if;
  select * into r from public.award_game_result(c,'낙성 요새 연습 · 44단계',30,30,true,100000);
  if r.coins_earned<>46 then raise exception 'TEST: practice reward mismatch'; end if;
  if (select label from private.story_clear_position(boss44))<>'11-44'
    or (select label from private.story_clear_position('스토리 10장 40 · 별빛이 끊긴 관측탑'))<>'10-40' then
    raise exception 'TEST: hall-of-fame position mismatch'; end if;
  if has_function_privilege('anon','public.claim_world_eleven_boss_result(uuid,text,integer,integer,integer)','execute')
    or not has_function_privilege('authenticated','public.claim_world_eleven_boss_result(uuid,text,integer,integer,integer)','execute') then
    raise exception 'TEST: RPC privileges mismatch'; end if;
end $test$;
`;

if (process.argv.includes('--sql')) console.log(regressionSql);
else console.log('World 11 account migration contracts verified');
