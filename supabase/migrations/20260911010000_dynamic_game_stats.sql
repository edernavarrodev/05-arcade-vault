alter table games add column dificultad smallint not null default 1;

-- plays pasa de texto mock ("12.4K") a contador real; se resetea a 0
-- porque el valor de texto no es convertible y ya no representa datos reales.
alter table games alter column plays drop default;
alter table games alter column plays type bigint using 0;
alter table games alter column plays set default 0;

-- best también se resetea: ya no es el mock, se recalcula desde scores reales.
update games set best = 0;

alter table scores add column level integer not null default 1;

create policy "games_public_update" on games for update using (true) with check (true);
