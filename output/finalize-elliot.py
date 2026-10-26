from pathlib import Path
p=Path('crystal-game.js');s=p.read_text(encoding='utf-8').replace('run.guardian&&!run.redReaper&&!run.lichDragon&&!run.morgana?','run.guardian&&!run.elliot&&!run.redReaper&&!run.lichDragon&&!run.morgana?');p.write_text(s,encoding='utf-8')
p=Path('GAME_DESIGN.md');s=p.read_text(encoding='utf-8');lines=s.splitlines(keepends=True)
for i,line in enumerate(lines):
 if '20단계는 아서의 스승' in line:
  lines[i]=line.replace('제한시간 5분','제한시간 4분').replace('5분 생존','4분 생존').replace('정답은 방어 여부와 관계없이 기록하며,','영어와 한글 뜻 5쌍을 연결하고 정답마다 상태창 DMG를 접촉 시점에 적용한다. 보스 게이지바는 제거하고 HP 숫자를 표시한다. 아이스 타임은 오답 또는 5쌍 완료 시 해제한다. 정답은 방어 여부와 관계없이 기록하며,')
p.write_text(''.join(lines),encoding='utf-8')
Path('supabase/migrations/20261020154139_elliot_four_minute_matching_trial.sql').rename('supabase/migrations/20261020154423_elliot_four_minute_matching_trial.sql')
