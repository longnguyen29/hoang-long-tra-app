-- Private, unguessable customer journey links. The token is a bearer credential: public
-- pages can reveal fulfilment progress, but never use it to expose contact/address data.

alter table orders add column if not exists public_tracking_token uuid;
update orders set public_tracking_token = gen_random_uuid() where public_tracking_token is null;
alter table orders alter column public_tracking_token set default gen_random_uuid();
alter table orders alter column public_tracking_token set not null;

create unique index if not exists orders_public_tracking_token_idx
  on orders(public_tracking_token);
