import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base='https://heojoon.github.io/english-word-card-game/';
const revision='05994ab';
const html=await fetch(base+'?verify='+revision).then(async response=>{assert.equal(response.status,200);return response.text();});
assert.ok(html.includes('sorcerus-boss.js?v=20261016-sd-animation'));
assert.ok(html.includes('crystal-game.js?v=20261016-sd-animation'));
const paths=['sorcerus-boss.js',...['idle','ice_time','healing','hit'].map(action=>'assets/monsters/sorcerus/char_sorcerus_sd_'+action+'_strip.png')];
const checks=await Promise.all(paths.map(async path=>{
 const response=await fetch(base+path+'?verify='+revision);assert.equal(response.status,200,path);
 const bytes=Buffer.from(await response.arrayBuffer());
 const expected=await readFile(new URL('./sorcerus-deployment/'+path,import.meta.url));
 const hash=value=>createHash('sha256').update(value).digest('hex');
 assert.equal(hash(bytes),hash(expected),path+' production content mismatch');
 return {path,status:response.status,bytes:bytes.length,sha256:hash(bytes)};
}));
await writeFile(new URL('./sorcerus-production-review.json',import.meta.url),JSON.stringify({revision,base,checks},null,2)+'\n');
console.log('Production verified: entry version, boss runtime and all four sprite sheets match the deployment files.');
