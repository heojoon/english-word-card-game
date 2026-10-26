import {readFileSync,writeFileSync} from 'node:fs';
for(const file of ['GAME_DESIGN.md','crystal-game.css','index.html']){
 let text=readFileSync(file,'utf8');
 text=text.replace(/^<<<<<<< HEAD\r?\n([\s\S]*?)^=======\r?\n([\s\S]*?)^>>>>>>>[^\n]*\n/gm,(_,head,ours)=>{
  if(file==='GAME_DESIGN.md')return ours.split(/\r?\n/).filter(l=>l.startsWith('- ')).slice(0,2).join('\n')+'\n'+head.split(/\r?\n/).filter(l=>l.startsWith('- ')).slice(1).join('\n')+'\n';
  if(file==='crystal-game.css')return ours+'\n'+head.slice(head.indexOf('/* World 6A:'));
  if(ours.includes('story-novel.js'))return head.split(/\r?\n/).filter(l=>l.includes('story-novel.js')).join('\n')+'\n'+ours.split(/\r?\n/).filter(l=>l.includes('crystal-game.js')).join('\n')+'\n';
  return ours;
 });
 if(/^(<<<<<<<|=======|>>>>>>>)/m.test(text))throw new Error('Unresolved conflict: '+file);
 writeFileSync(file,text);
}
