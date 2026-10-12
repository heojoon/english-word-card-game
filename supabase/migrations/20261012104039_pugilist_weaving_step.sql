-- Story active skill metadata; the existing Crystal Bag passive stays in classDefs.
update public.story_skill_icons
set label = '위빙 스텝',
    asset_path = 'assets/ui/skills/active-pugilist-weaving-step.svg',
    gem_color = '#d9f8f2',
    glow_color = '#60D9CF',
    icon_color = '#5751D8',
    updated_at = now()
where code = 'combo_crystal';

update public.story_skill_definitions
set skill_code = 'weaving_step',
    skill_name = '위빙 스텝',
    description = 'MP 1을 소모해 다음 오답 한 번의 HP 감소와 콤보 초기화를 막아요. 틀린 문제는 다시 풀어야 해요.',
    updated_at = now()
where class_code = 'pugilist';
