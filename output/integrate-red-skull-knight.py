from pathlib import Path

def once(text, before, after):
    if text.count(before) != 1:
        raise ValueError(f'Expected exactly one occurrence: {before[:65]!r}, found {text.count(before)}')
    return text.replace(before, after, 1)

path = Path('crystal-game.js')
js = path.read_text(encoding='utf-8-sig')
js = once(js, "desc:chapter===9&&stage.number===30?", "desc:chapter===8&&stage.number===30?'레드스컬나이트 · HP 180 · 5분 30초 · 연결문제 · 화염 파동 · 홍염 참격 · 최초 900 크리스털':chapter===9&&stage.number===30?")
js = once(js, 'questionCount:chapter===9&&stage.number===30?220:', 'questionCount:chapter===8&&stage.number===30?180:chapter===9&&stage.number===30?220:')
js = once(js, 'darkTriton:chapter===9&&stage.number===30,', 'redSkullKnight:chapter===8&&stage.number===30,darkTriton:chapter===9&&stage.number===30,')
js = once(js, 'if(source.darkTriton)return window.WORDORIA_DARK_TRITON.deck(source.words,shuffle);', 'if(source.redSkullKnight)return window.WORDORIA_RED_SKULL_KNIGHT.deck(source.words,shuffle);\n    if(source.darkTriton)return window.WORDORIA_DARK_TRITON.deck(source.words,shuffle);')
js = once(js, 'const info=chapter===9&&stage.number===30?', 'const info=chapter===8&&stage.number===30?window.WORDORIA_RED_SKULL_KNIGHT.INFO:chapter===9&&stage.number===30?')
js = once(js, 'if(source.darkTriton)Object.assign(run,', 'if(source.redSkullKnight)Object.assign(run,window.WORDORIA_RED_SKULL_KNIGHT.reset(),{guardianReducedMotion:reducedMotion(),bossAttackSteps:bossAttackSteps()});\n    if(source.darkTriton)Object.assign(run,')
js = once(js, 'if(run.darkTriton){window.WORDORIA_DARK_TRITON.board(run,shuffle);', 'if(run.redSkullKnight){window.WORDORIA_RED_SKULL_KNIGHT.board(run,shuffle);run.last=performance.now();run.petEffects?.onQuestion();return;}if(run.darkTriton){window.WORDORIA_DARK_TRITON.board(run,shuffle);')
js = once(js, 'if(run.darkTriton)return renderDarkTritonBattle();', 'if(run.redSkullKnight)return renderRedSkullKnightBattle();\n    if(run.darkTriton)return renderDarkTritonBattle();')

start = js.index('  function darkTritonSpriteStyle(){')
end = js.index('  function nereusSpriteStyle(){', start)
block = js[start:end]
for old, new in [
    ('darkTriton','redSkullKnight'), ('DarkTriton','RedSkullKnight'), ('DARK_TRITON','RED_SKULL_KNIGHT'),
    ('dark-triton','red-skull-knight'), ('triton','knight'), ('Triton','Knight'),
    ('WORLD 7B','WORLD 7A'), ('다크 트라이튼','레드스컬나이트'), ('검은 호수의 인어 왕','불타는 탑의 수호자'),
    ('world-seven-b-battle world-seven-b-final-boss','world-seven-a-battle world-seven-a-final-boss'),
    ('220','180'), ('p.kind===\'wave\'?.1:.25','p.kind===\'wave\'?.1:.25'),
]:
    block = block.replace(old, new)
block = block.replace("boss.SPRITE_ROOT+'char_red_skull_knight_'+v.action.replaceAll('-','_')+'_strip.png'", "boss.SPRITE_ROOT+'char_red_skull_knight_sd_'+v.action+'_strip.png'")
block = block.replace("background-image:url('${deployedAssetUrl(boss.SPRITE_ROOT+'fx_red_skull_knight_'+p.kind+'_strip.png')}');background-position:${p.frame/2*100}% 0", "--flame-progress:${p.progress};")
block = block.replace('class="red-skull-knight-projectile"', 'class="red-skull-knight-projectile ${p.kind}"')
block = block.replace("if(event==='trident-hit')", "if(event==='trident-hit')")
js = js[:start] + block + js[start:]
js = once(js, 'if(run?.darkTriton){advanceDarkTritonBattle(delta,clockDelta);return;}', 'if(run?.redSkullKnight){advanceRedSkullKnightBattle(delta,clockDelta);return;}\n    if(run?.darkTriton){advanceDarkTritonBattle(delta,clockDelta);return;}')
js = once(js, 'function storyPick(button){if(run?.darkTriton)', 'function storyPick(button){if(run?.redSkullKnight){redSkullKnightPick(button);return;}if(run?.darkTriton)')
js = once(js, 'if(run.guardian&&!run.sorcerus&&!run.banditChief&&!run.abyssGolem&&!run.morgana&&!run.elliot&&!run.darkTriton', 'if(run.guardian&&!run.redSkullKnight&&!run.sorcerus&&!run.banditChief&&!run.abyssGolem&&!run.morgana&&!run.elliot&&!run.darkTriton')
js = once(js, 'if(run.darkTriton){window.WORDORIA_DARK_TRITON.clear(run);', 'if(run.redSkullKnight){window.WORDORIA_RED_SKULL_KNIGHT.clear(run);if(clear)run.deck=run.deck.slice(0,run.correct);}\n    if(run.darkTriton){window.WORDORIA_DARK_TRITON.clear(run);')
js = once(js, 'if(run.sorcerus&&clear){await saveSorcerusMidbossReward(run);return;}', 'if(run.redSkullKnight&&clear){await saveRedSkullKnightReward(run);return;}\n    if(run.sorcerus&&clear){await saveSorcerusMidbossReward(run);return;}')
js = js.replace('run?.darkTriton||run?.nereus||run?.morgana', 'run?.redSkullKnight||run?.darkTriton||run?.nereus||run?.morgana')
js = js.replace('run?.darkTriton||run?.nereus||run?.elliot', 'run?.redSkullKnight||run?.darkTriton||run?.nereus||run?.elliot')
js = js.replace('run.guardian&&!run.darkTriton&&!run.nereus', 'run.guardian&&!run.redSkullKnight&&!run.darkTriton&&!run.nereus')
path.write_text(js, encoding='utf-8')

path = Path('index.html')
html = path.read_text(encoding='utf-8-sig')
html = once(html, '<script src="dark-triton-boss.js', '<script src="red-skull-knight-boss.js?v=20261024" defer></script>\n  <script src="dark-triton-boss.js')
path.write_text(html, encoding='utf-8')

path = Path('scripts/build-web.mjs')
build = path.read_text(encoding='utf-8-sig')
build = once(build, "'story-novel.js', 'dark-triton-boss.js'", "'story-novel.js', 'red-skull-knight-boss.js', 'dark-triton-boss.js'")
path.write_text(build, encoding='utf-8')
