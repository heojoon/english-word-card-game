from pathlib import Path

p=Path('crystal-game.js')
s=p.read_text(encoding='utf-8')
def replace(a,b):
    global s
    assert a in s, a
    s=s.replace(a,b)
replace("base.number===30?'검은 세이렌의 대왕'", "base.number===30?'다크 트라이튼'")
replace("desc:chapter===9&&stage.number===15?", "desc:chapter===9&&stage.number===30?'다크 트라이튼 · HP 220 · 5분 · 연결문제 · 스톰서지 · 트라이던트 쓰루':chapter===9&&stage.number===15?")
replace('questionCount:chapter===9&&stage.number===15?', 'questionCount:chapter===9&&stage.number===30?220:chapter===9&&stage.number===15?')
replace('nereus:chapter===9&&stage.number===15,','darkTriton:chapter===9&&stage.number===30,nereus:chapter===9&&stage.number===15,')
replace('    if(source.nereus)return', '    if(source.darkTriton)return window.WORDORIA_DARK_TRITON.deck(source.words,shuffle);\n    if(source.nereus)return')
replace('const info=chapter===9&&stage.number===15?', 'const info=chapter===9&&stage.number===30?window.WORDORIA_DARK_TRITON.INFO:chapter===9&&stage.number===15?')
replace('    if(source.nereus)Object.assign', '    if(source.darkTriton)Object.assign(run,window.WORDORIA_DARK_TRITON.reset(),{guardianReducedMotion:reducedMotion(),bossAttackSteps:bossAttackSteps()});\n    if(source.nereus)Object.assign')
replace('if(run.nereus){window.WORDORIA_NEREUS.board', 'if(run.darkTriton){window.WORDORIA_DARK_TRITON.board(run,shuffle);run.last=performance.now();run.petEffects?.onQuestion();return;}if(run.nereus){window.WORDORIA_NEREUS.board')
replace('    if(run.nereus)return renderNereusBattle();','    if(run.darkTriton)return renderDarkTritonBattle();\n    if(run.nereus)return renderNereusBattle();')
replace('    if(run?.nereus){advanceNereusBattle', '    if(run?.darkTriton){advanceDarkTritonBattle(delta,clockDelta);return;}\n    if(run?.nereus){advanceNereusBattle')
replace("function storyPick(button){if(run?.nereus)", "function storyPick(button){if(run?.darkTriton){darkTritonPick(button);return;}if(run?.nereus)")
replace('!run.nereus', '!run.darkTriton&&!run.nereus')
replace('run.nereus||', 'run.darkTriton||run.nereus||')
replace('run?.nereus||', 'run?.darkTriton||run?.nereus||')
replace('    if(run.nereus){window.WORDORIA_NEREUS.clear(run);if(clear)', '    if(run.darkTriton){window.WORDORIA_DARK_TRITON.clear(run);if(clear)run.deck=run.deck.slice(0,run.correct);}\n    if(run.nereus){window.WORDORIA_NEREUS.clear(run);if(clear)')
replace("function removeBattleReward(){", "function removeBattleReward(){if(run?.darkTriton&&run.done)window.WORDORIA_DARK_TRITON.clear(run);")
replace('if(run?.elliot||run?.redReaper||run?.lichDragon||run?.morgana)return;', 'if(run?.darkTriton||run?.nereus||run?.elliot||run?.redReaper||run?.lichDragon||run?.morgana)return;')
# Keep the established matching/active-skill markup consistent with other bosses.
renderer=s[s.index('  function nereusSpriteStyle()'):s.index('  function syncNereusBattleVisual()')]
renderer=renderer.replace('nereusSpriteStyle','darkTritonSpriteStyle').replace('renderNereusBattle','renderDarkTritonBattle').replace('WORDORIA_NEREUS','WORDORIA_DARK_TRITON')
renderer=renderer.replace("'char_nereus_sd_'+v.action", "'char_dark_triton_'+v.action.replaceAll('-','_')")
renderer=renderer.replace('boss.englishLabel(run,item.entry)','item.entry[0]')
renderer=renderer.replace('${side===\'en\'&&run.nereusSpeedMs>0?\'aria-label="고속이동으로 가려진 영어 단어"\':\'\'}','')
renderer=renderer.replace('WORLD 7B · MID BOSS','WORLD 7B · FINAL BOSS').replace('네레우스 <small>흑조의 창기사</small>','다크 트라이튼 <small>검은 호수의 인어 왕</small>')
renderer=renderer.replace('world-seven-b-midboss','world-seven-b-final-boss').replace('nereus','dark-triton').replace('흑조의 창기사 네레우스','다크 트라이튼').replace('네레우스 HP','다크 트라이튼 HP')
renderer=renderer.replace('run.dark-tritonPlayerHit','run.tritonPlayerHit').replace('run.dark-tritonNotice','run.tritonNotice')
renderer=renderer.replace('aria-valuemax="200"','aria-valuemax="220"').replace('run.bossHp/2','run.bossHp/220*100').replace(' / 200',' / 220')
renderer=renderer.replace("${run.dark-tritonSpeedMs>0?' · 고속이동 '+Math.ceil(run.dark-tritonSpeedMs/1000)+'초':''}",'')
pick=s[s.index('  function nereusPick('):s.index('  function advanceNereusBattle')].replace('nereusPick','darkTritonPick').replace('run?.nereus','run?.darkTriton').replace('WORDORIA_NEREUS','WORDORIA_DARK_TRITON').replace('syncNereusBattleVisual','syncDarkTritonBattleVisual')
advance=s[s.index('  function advanceNereusBattle'):s.index('  function renderRedReaperBattle')]
advance=advance.replace('advanceNereusBattle','advanceDarkTritonBattle').replace('WORDORIA_NEREUS.advance(run,delta,Math.random,clockDelta)','WORDORIA_DARK_TRITON.advance(run,delta,shuffle,clockDelta)').replace('run.nereusClock','run.tritonClock').replace('syncNereusBattleVisual','syncDarkTritonBattleVisual').replace("event==='spear-hit'", "event==='trident-hit'")
advance=advance.replace("if(event==='hit'){", "if(event==='release')emitAudio('ATTACK_SPECIAL','sfx');\n      if(event==='shuffle')emitAudio('ATTACK_SPECIAL','sfx');\n      if(event==='trident-hit')emitAudio('PLAYER_HIT','sfx');\n      if(event==='hit'){emitAudio('ENEMY_HIT','sfx');")
sync='''  function syncDarkTritonBattleVisual(){
    const boss=window.WORDORIA_DARK_TRITON,sprite=document.querySelector('.dark-triton-sprite');
    if(sprite)sprite.style.cssText=darkTritonSpriteStyle();
    const arena=$('arena'),enemy=arena?.querySelector('.dark-triton-enemy'),hero=arena?.querySelector('.battle-hero'),layer=arena?.querySelector('.dark-triton-projectiles');
    if(!layer||!enemy||!hero)return;
    const a=arena.getBoundingClientRect(),b=enemy.getBoundingClientRect(),h=hero.getBoundingClientRect();
    const target={x:h.left-a.left+h.width*.55,y:h.top-a.top+h.height*.4};
    layer.innerHTML=boss.projectiles(run).map(p=>{
      const origin={x:b.left-a.left+b.width*(p.kind==='wave'?.1:.25),y:b.top-a.top+b.height*.35};
      return `<span class="dark-triton-projectile" style="left:${origin.x+(target.x-origin.x)*p.progress}px;top:${origin.y+(target.y-origin.y)*p.progress}px;background-image:url('${deployedAssetUrl(boss.SPRITE_ROOT+'fx_dark_triton_'+p.kind+'_strip.png')}');background-position:${p.frame/2*100}% 0"></span>`;
    }).join('');
  }
'''
replace('  function nereusSpriteStyle()',renderer+sync+pick+advance+'  function nereusSpriteStyle()')
p.write_text(s,encoding='utf-8')

p=Path('index.html');s=p.read_text(encoding='utf-8').replace('nereus-20261022-world7','dark-triton-20261022').replace('crystal-game.js?v=20261022-nereus','crystal-game.js?v=20261022-dark-triton')
s=s.replace('  <script src="nereus-boss.js', '  <script src="dark-triton-boss.js?v=20261022" defer></script>\n  <script src="nereus-boss.js');p.write_text(s,encoding='utf-8')
p=Path('scripts/build-web.mjs');s=p.read_text(encoding='utf-8').replace("'story-novel.js', 'nereus-boss.js'", "'story-novel.js', 'dark-triton-boss.js', 'nereus-boss.js'");p.write_text(s,encoding='utf-8')
p=Path('scripts/generate-story-novel.mjs');s=p.read_text(encoding='utf-8').replace("    if(world==='7b'&&speaker==='검은 세이렌 기사'){", "    if(world==='7b'&&['검은 세이렌의 대왕','다크 트라이튼'].includes(speaker)){\n      line.speaker='다크 트라이튼';line.className='dark-triton';\n      line.artPath='assets/monsters/dark-triton/dark-triton-standing.png';\n    }\n    if(world==='7b'&&speaker==='검은 세이렌 기사'){");p.write_text(s,encoding='utf-8')
