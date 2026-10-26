from pathlib import Path
p=Path('elliot-boss.js');s=p.read_text(encoding='utf-8').replace("time:'5분'","time:'4분'").replace('5분 동안 생존','4분 동안 생존').replace('모르가나는','엘리엇은');p.write_text(s,encoding='utf-8')
p=Path('crystal-game.js');s=p.read_text(encoding='utf-8')
s=s.replace('5분 생존 + HP 250 이하','4분 생존 + HP 250 이하').replace('소드마스터 · 5분의 시험','소드마스터 · 4분의 시험').replace('엘리엇 · 5분의 시험','엘리엇 · 4분의 시험').replace('5분을 버텼지만','4분을 버텼지만')
s=s.replace('if(run.morgana){window.WORDORIA_MORGANA.board','if(run.elliot){window.WORDORIA_ELLIOT.board(run,shuffle);run.last=performance.now();run.petEffects?.onQuestion();return;}if(run.morgana){window.WORDORIA_MORGANA.board')
a=s.index('    const boss=window.WORDORIA_ELLIOT,choices=');b=s.index('\n',a)
s=s[:a]+'''    const boss=window.WORDORIA_ELLIOT;
    const column=(side,items)=>`<div class="story-match-column">${items.map(item=>`<button class="story-match-item ${run.matched.has(item.id)?'matched':''} ${run[side==='ko'?'selectedKo':'selectedEn']===item.id?'selected':''}" data-action="story-pick" data-side="${side}" data-id="${item.id}" ${run.matched.has(item.id)||run.locked||run.stunned||run.paused?'disabled':''}>${esc(item.entry[side==='ko'?2:0])}${run.eagleEyeActive?eaglePairHintMarkup(item.id,side):''}${run.sniperInsight?sniperPairHintMarkup(item.id):''}${run.petHint?petPairHintMarkup(item.id):''}</button>`).join('')}</div>`;'''+s[b:]
a=s.index('<div class="guardian-health" role="meter" aria-label="엘리엇');b=s.index('<span class="bandit-hp-label">',a);s=s[:a]+s[b:]
a=s.index('  function renderElliotBattle(');b=s.index('  function advanceElliotBattle(',a)
s=s[:a]+s[a:b].replace('<div class="question-card guardian-question"><h1>${esc(run.question.prompt)}</h1></div><div class="answers guardian-answers">${choices}</div>',"<p class=\"lich-match-instruction\">영어와 한글 뜻을 연결하세요 · 정답마다 DMG ${run.bossAttackSteps}</p><div class=\"story-match-board\">${column('ko',run.matchKo)}${column('en',run.matchEn)}</div>")+s[b:]
a=s.index('  function advanceElliotBattle(');b=s.index('  function ',a+12);s=s[:a]+s[a:b].replace("if(event==='ready')prepareQuestion();","if(event==='board-ready')prepareQuestion();")+s[b:]
s=s.replace('  function storyPick(button){','  function storyPick(button){if(run?.elliot){elliotPick(button);return;}')
s=s.replace('if(run?.redReaper||run?.lichDragon||run?.morgana)return;','if(run?.elliot||run?.redReaper||run?.lichDragon||run?.morgana)return;')
a=s.index('  async function saveElliotReward(');b=s.index('  async function ',a+12);s=s[:a]+s[a:b].replace('300000','240000')+s[b:]
a=s.index('  function advanceElliotBattle(')
s=s[:a]+'''  function elliotPick(button){
    if(!run?.elliot||run.done||run.paused||run.locked||run.stunned||run.weavingStepDodging)return;
    const side=button.dataset.side,id=Number(button.dataset.id);
    if(!['ko','en'].includes(side)||run.matched.has(id)||!run.matchEn.some(x=>x.id===id))return;
    const other=run[side==='ko'?'selectedEn':'selectedKo'];
    if(other!==null&&other!==id&&run.weavingStepActive&&consumePugilistWeavingStep())return;
    if(run.eagleEyeActive&&side==='en'&&run.eagleEyePairId!==id)run.selectedKo=null;
    const result=window.WORDORIA_ELLIOT.pick(run,side,id,battleContactDelay());
    if(!result)return;
    if(result==='selected'){if(run.eagleEyeActive&&side==='en')run.eagleEyePairId=id;render();return;}
    run.eagleEyeActive=false;run.eagleEyePairId=null;
    if(result==='correct'){
      if(run.slashExpiresAt>performance.now()){run.slashCombo++;run.slashBonus+=run.slashCombo*2;}
      speak(run.matchEn.find(x=>x.id===id).entry[0]);
    }else document.dispatchEvent(new CustomEvent('wordoria:haptic',{detail:{kind:'error'}}));
    render();
  }
'''+s[a:];p.write_text(s,encoding='utf-8')
for f in ['assets/novel/world-6b-boss-start.md','assets/novel/world-6b-boss-end.md']:
 p=Path(f);p.write_text(p.read_text(encoding='utf-8').replace('5분','4분'),encoding='utf-8')
for f in ['tests/elliot-boss.test.mjs','tests/elliot-reward.test.mjs','tests/elliot-reward.integration.sql']:
 p=Path(f);s=p.read_text(encoding='utf-8').replace('300000','240000').replace('299999','239999').replace('five minutes','four minutes').replace('hits,14','hits,11');p.write_text(s,encoding='utf-8')
