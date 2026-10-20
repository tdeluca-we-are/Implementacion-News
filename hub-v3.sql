-- ═══════════════════════════════════════════════════════════════════════════
-- WE ARE — Implementación de news · v3: conexión con el calendario de Owned Media
--
-- Correr DESPUÉS de hub-schema.sql, hub-v2.sql y calendario-schema.sql.
-- Se puede correr más de una vez.
-- ═══════════════════════════════════════════════════════════════════════════

-- Cada news puede venir de un envío de email del calendario.
alter table nws_news add column if not exists cal_envio_id int references cal_envios(id) on delete set null;
-- Un envío del calendario tiene una sola news viva (si se cancela, se puede armar otra).
create unique index if not exists nws_news_cal_envio_idx on nws_news (cal_envio_id)
  where cal_envio_id is not null and estado <> 'cancelada';

-- ── Del calendario al hub ───────────────────────────────────────────────────
-- Envíos de email de la marca para armar como news. Lo usa el hub: alcanza con
-- poder editar la marca en el hub (no hace falta acceso al calendario).
create or replace function nws_envios_calendario(m int)
returns table (id int, fecha date, hora text, titulo text, asunto text, segmento text, estado text, news_id int)
language sql stable security definer set search_path = public as $$
  select e.id, e.fecha, e.hora, e.titulo, e.asunto, e.segmento, e.estado,
         (select n.id from nws_news n where n.cal_envio_id = e.id and n.estado <> 'cancelada' limit 1)
    from cal_envios e
   where nws_puede_editar(m)
     and e.marca_id = m and e.canal = 'email' and not coalesce(e.bandeja, false)
     and e.estado in ('idea', 'planificado', 'aprobado')
     and e.fecha >= (now() at time zone 'America/Argentina/Buenos_Aires')::date - 7
   order by e.fecha, e.hora nulls last, e.id
$$;

-- ── Del hub al calendario ───────────────────────────────────────────────────
-- En qué quedó la news de cada envío. Lo usa el calendario: alcanza con poder
-- ver la marca en el calendario (no hace falta acceso al hub).
create or replace function nws_estado_envios(m int)
returns table (cal_envio_id int, news_id int, estado text)
language sql stable security definer set search_path = public as $$
  select n.cal_envio_id, n.id, n.estado
    from nws_news n
   where cal_puede_ver(m)
     and n.marca_id = m and n.cal_envio_id is not null and n.estado <> 'cancelada'
$$;

revoke execute on function nws_envios_calendario(int), nws_estado_envios(int) from public, anon;
grant execute on function nws_envios_calendario(int), nws_estado_envios(int) to authenticated;

-- Cuando la news queda cargada en la herramienta, el envío del calendario pasa a
-- "aprobado" ("enviado" lo sigue marcando el equipo al cerrar el mes).
create or replace function nws_news_al_calendario() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.cal_envio_id is not null and new.estado = 'cargada'
     and (tg_op = 'INSERT' or old.estado is distinct from 'cargada') then
    update cal_envios set estado = 'aprobado', actualizado_at = now()
     where id = new.cal_envio_id and estado in ('idea', 'planificado');
  end if;
  return null;
end $$;

drop trigger if exists nws_news_al_calendario on nws_news;
create trigger nws_news_al_calendario after insert or update on nws_news
  for each row execute function nws_news_al_calendario();
