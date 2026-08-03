create table if not exists public.order_counter (
  id text primary key,
  next_number bigint not null
);

insert into public.order_counter (id, next_number)
values ('invoice', 260100010)
on conflict (id) do nothing;

create or replace function public.next_order_number()
returns bigint
language plpgsql
security definer
as $$
declare n bigint;
begin
  update public.order_counter
     set next_number = next_number + 1
   where id = 'invoice'
  returning next_number - 1 into n;
  return n;
end;
$$;

revoke all on function public.next_order_number() from public, anon, authenticated;
