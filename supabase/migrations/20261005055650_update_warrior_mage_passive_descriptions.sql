update public.story_skill_definitions
set description = case class_code
  when 'warrior' then '문제마다 40% 확률로 제한시간을 5초 늘려요.'
  when 'mage' then '문제마다 30% 확률로 타이머를 1.5초 멈춰요.'
end
where (class_code = 'warrior' and skill_code = 'guardian_time')
   or (class_code = 'mage' and skill_code = 'time_stop');
