from pathlib import Path
p=Path('crystal-game.js')
s=p.read_text(encoding='utf-8').replace('vocabularyDay:index*2+1','vocabularyDay:index+1,sourceNumber:index<10?35+index:5+index').replace('WordMax 5300','WordMax Level 3').replace('Day ${index*2+1}', 'Day ${index+1}')
s=s.replace('chapter===8?window.WORDORIA_WORLD7A_VOCABULARY?.[level]?.[stage.vocabularyDay]:chapter>1?', 'chapter>1?').replace('(chapter===8||stageLevel(source)===level)','stageLevel(source)===level')
p.write_text(s,encoding='utf-8')
p=Path('index.html'); s=p.read_text(encoding='utf-8'); s='\n'.join(l for l in s.split('\n') if 'world7a-content.js' not in l); p.write_text(s,encoding='utf-8')
p=Path('scripts/build-web.mjs'); p.write_text(p.read_text(encoding='utf-8').replace("  'world7a-content.js',\n",''),encoding='utf-8')
