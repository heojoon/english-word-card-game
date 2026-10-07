import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../crystal-game.js',import.meta.url),'utf8');
function setup(){
 const context=vm.createContext({run:{story:true,mp:1,slashBonus:12,slashExpiresAt:0},selectedCharacter:{class:'warrior'},performance:{now:()=>1000},render(){},emitAudio(){}});
 const activation=source.slice(source.indexOf('  function activateWarriorSlash()'),source.indexOf('  function storyPick('));
 vm.runInContext(activation,context);return context;
}
test('slash consumes MP, preserves accumulated rewards, and allows activation whenever MP is available',()=>{
 const c=setup();c.activateWarriorSlash();assert.equal(c.run.mp,0);assert.equal(c.run.slashExpiresAt,11000);assert.equal(c.run.slashBonus,12);
 c.run.mp=1;c.performance.now=()=>2000;c.activateWarriorSlash();assert.equal(c.run.mp,0);assert.equal(c.run.slashExpiresAt,12000);
 c.run.mp=1;
 c.performance.now=()=>12001;c.activateWarriorSlash();assert.equal(c.run.mp,0);assert.equal(c.run.slashExpiresAt,22001);assert.equal(c.run.slashBonus,12);
});
test('resume extends active slash by paused duration',()=>{
 const c=setup();c.run={story:true,paused:true,pausedAt:2000,slashExpiresAt:6000,mobs:[]};c.performance.now=()=>5000;
 Object.assign(c,{closeDialog(){},window:{},tick(){}});
 const resume=source.slice(source.indexOf('  function resume()'),source.indexOf('  function cancelSpeech()'));
 vm.runInContext(resume,c);c.resume();assert.equal(c.run.slashExpiresAt,9000);assert.equal(c.run.paused,false);
});
test('restored MP makes an expired skill bright and usable again',()=>{
 const c=setup();const classes=new Set(['used']);const properties={};
 const slot={style:{setProperty:(key,value)=>properties[key]=value},classList:{toggle:(key,on)=>on?classes.add(key):classes.delete(key)},dataset:{},setAttribute(){},querySelector:()=>({textContent:''})};
 c.document={querySelector:()=>slot};c.run.slashSkillUsed=true;c.run.slashExpiresAt=500;c.run.mp=0;
 vm.runInContext(source.slice(source.indexOf('  function updateWarriorSlash('),source.indexOf('  function activateWarriorSlash()')),c);
 c.updateWarriorSlash();assert.equal(slot.disabled,true);assert.equal(properties['--slash-sweep'],'360deg');
 c.run.mp=1;c.updateWarriorSlash();assert.equal(slot.disabled,false);assert.equal(slot.dataset.action,'activate-slash');assert.equal(properties['--slash-sweep'],'0deg');assert.equal(classes.has('used'),false);
});
