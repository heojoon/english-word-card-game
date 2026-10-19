import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import test from 'node:test';

const root=new URL('../',import.meta.url);
const game=readFileSync(new URL('crystal-game.js',root),'utf8');
const migration=readFileSync(new URL('supabase/migrations/20261019152329_add_corrupted_equipment.sql',root),'utf8');

const expected=[
  ['corrupted_sword','타락한 검','weapon',9,250],
  ['corrupted_boots','타락한 장화','feet',9,250],
  ['corrupted_helmet','타락한 투구','head',8,250],
  ['corrupted_cape','타락의 망토','back',8,250],
  ['corrupted_ring','타락의 반지','aura',8,250],
  ['corrupted_armor','타락한 갑옷','body',8,250],
  ['corrupted_staff','타락한 지팡이','weapon',11,400]
];

test('corrupted equipment catalog matches the requested special attack set',()=>{
  for(const [code,name,slot,attack,price] of expected){
    const artPath=`assets/items/equipment/item_${code}_special.webp`;
    assert.ok(existsSync(new URL(artPath,root)),`${artPath} should exist`);
    for(const source of [game,migration]){
      assert.match(source,new RegExp(`code:'${code}'|\\('${code}'`));
      assert.match(source,new RegExp(name));
      assert.match(source,new RegExp(`'${slot}'[^\\n]*'special'[^\\n]*2[^\\n]*'atk'[^\\n]*${attack}`));
      assert.match(source,new RegExp(`${price}`));
      assert.match(source,/상대방을 쓰러트리기 위해 공격에 특화된 장비/);
      assert.match(source,new RegExp(artPath.replaceAll('/','\\/').replace('.','\\.')));
    }
  }
});
