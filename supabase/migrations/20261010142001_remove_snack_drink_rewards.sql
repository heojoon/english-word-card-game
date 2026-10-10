-- Preserve redemption and ledger history while removing these rewards from sale.
update public.shop_items
set active = false
where code in ('snack', 'drink');
