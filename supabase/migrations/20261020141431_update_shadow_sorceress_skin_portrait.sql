-- Skin display art only; retain the transparent story/boss CG and SD strips.
update public.shop_items
set art_path = 'assets/avatars/skins/mage-male-shadow-sorceress.webp'
where code = 'mage_shadow_sorceress_skin';
