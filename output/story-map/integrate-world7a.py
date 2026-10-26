from pathlib import Path
import json

path = Path('crystal-game.js')
s = path.read_text(encoding='utf-8')
def replace(old, new):
    global s
    assert old in s, old[:100]
    s = s.replace(old, new, 1)

replace('  ];\n  const storyWorlds=[', '''    ,...Array.from({length:30},(_,index)=>({number:index+1,chapter:8,key:`story-ch7a-${index+1}`,vocabularyDay:index*2+1,name:index===14?'케우르스':index===29?'레드스컬나이트':`심연의 불타는 고대 탑 · ${index+1}단계`,desc:`WordMax 5300 · Day ${index*2+1} · 연결형 30문제 · 문제당 2초`}))
  ];
  const storyWorlds=[''')
positions = [[f'{[20,43,68,83,62,38,18,40,65,82][i%10]}%', f'{5+i*3.05:.2f}%'] for i in range(30)]
world = dict(number=8, displayNumber='7A', unlockAfter=7, name='심연의 불타는 고대 탑', region='BURNING ANCIENT TOWER OF THE ABYSS', art='assets/story/chapter-7a-burning-ancient-tower-map.webp', positions=positions)
replace('  function configureStoryContent(world=null){', '  storyWorlds.push('+json.dumps(world,ensure_ascii=False,separators=(',',':'))+');\n  function configureStoryContent(world=null){')
replace("const source=chapter>1?stages[", "const source=chapter===8?window.WORDORIA_WORLD7A_VOCABULARY?.[level]?.[stage.vocabularyDay]:chapter>1?stages[")
replace("pool=source&&stageLevel(source)===level?source.words:[]", "pool=source&&(chapter===8||stageLevel(source)===level)?source.words:[]")
replace("(chapter===7?'6A':chapter)", "(chapter===8?'7A':chapter===7?'6A':chapter)")
replace("desc:chapter===6&&stage.number===20?", "desc:chapter===8?`${stage.desc}${[15,30].includes(stage.number)?` · ${stage.name}`:''}`:chapter===6&&stage.number===20?")
replace("questionCount:chapter===6?", "questionCount:chapter===8?30:chapter===6?")
replace("story:true,storyChapter:chapter", "...(chapter===8?{questionTimeMs:2000,vocabularyDay:stage.vocabularyDay,encounterName:[15,30].includes(stage.number)?stage.name:null,source:source?.source}:{}),story:true,storyChapter:chapter")
replace("chosenStoryBranch()===(chapter===7?'6A':'6B')", "chosenStoryBranch()===([7,8].includes(chapter)?'6A':'6B')")
replace("if((stage.chapter===7||stage.chapter===6)&&stage.number===1)", "if(stage.chapter===8&&stage.number===1)return stageCleared('story-ch6a-20');if((stage.chapter===7||stage.chapter===6)&&stage.number===1)")
replace("const previousNumber=world.number>=6&&!isAdministrator()?5:world.number-1,nextNumber=isAdministrator()?world.number+1:world.number===5?(chosenStoryBranch()==='6A'?7:6):world.number>=6?storyWorlds.length+1:world.number+1;", "const previousNumber=world.number===8?7:world.number>=6&&!isAdministrator()?5:world.number-1,nextNumber=world.number===7?8:world.number===8?storyWorlds.length+1:isAdministrator()?world.number+1:world.number===5?(chosenStoryBranch()==='6A'?7:6):world.number>=6?storyWorlds.length+1:world.number+1;")
replace("storyTimeLimit:deck.length*3000", "storyTimeLimit:deck.length*(source.questionTimeMs||3000)")
replace("${stage.number}${unlocked?'':'<span", "${stage.number}${stage.chapter===8&&[15,30].includes(stage.number)?' ⚔':''}${unlocked?'':'<span")
replace("${story?'':'LV. 1 · 민트 슬라임'}", "${story?esc(stages[selectedStage]?.encounterName||''):'LV. 1 · 민트 슬라임'}")
path.write_text(s, encoding='utf-8')

layout = dict(world='7A',stageCount=30,art=world['art'],positions=positions,bossStages={'15':'케우르스','30':'레드스컬나이트'},questionCount=30,questionTimeMs=2000,questionType='matching',middleVocabularyDays=list(range(1,60,2)))
Path('assets/story/chapter-7a-map-layout.json').write_text(json.dumps(layout,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

for name in ['index.html','scripts/build-web.mjs']:
    p=Path(name); t=p.read_text(encoding='utf-8')
    if name=='index.html':
        t=t.replace('  <script src="crystal-game.js?', '  <script src="world7a-content.js?v=20261021-world7a" defer></script>\n  <script src="crystal-game.js?',1)
        t=t.replace('20261021-elliot-matching','20261021-world7a',1)
    else:
        t=t.replace("  'crystal-game.js',", "  'crystal-game.js',\n  'world7a-content.js',",1)
    p.write_text(t,encoding='utf-8')
