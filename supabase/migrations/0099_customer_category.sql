-- Manual customer classification; demand examples are guidance, not rules.
alter table public.trade_opportunities
  add column if not exists customer_category text
  check (customer_category is null or customer_category in ('milk_tea_shop','chain','distributor','partner','other'));
