-- ═══════════════════════════════════════════════════════════════════════════
-- WE ARE — Implementación de news · v2: carga automática en la herramienta
--
-- Correr DESPUÉS de hub-schema.sql. Se puede correr más de una vez.
-- ═══════════════════════════════════════════════════════════════════════════

-- Qué versión se cargó en la herramienta y se testeó. Aprobar exige que sea la
-- actual: así nadie aprueba mirando el test de una versión anterior.
alter table nws_news add column if not exists implementado_huella text;
alter table nws_news add column if not exists implementado_at     timestamptz;

-- ── CREDENCIALES DE LAS HERRAMIENTAS ────────────────────────────────────────
-- Una por marca y herramienta (la da el proveedor). Nadie la puede leer desde
-- el navegador: solo la función de servidor (service role). El admin la carga
-- o la reemplaza con nws_guardar_credencial; el hub solo ve si está cargada.
create table if not exists nws_credenciales (
  marca_id        int  not null references sem_marcas(id) on delete cascade,
  herramienta     text not null,
  datos           jsonb not null,   -- ej. {"authorization": "...", "onBehalfOf": "..."}
  actualizado_por text,
  actualizado_at  timestamptz not null default now(),
  primary key (marca_id, herramienta)
);
alter table nws_credenciales enable row level security;
revoke all on nws_credenciales from anon, authenticated;

create or replace function nws_guardar_credencial(m int, h text, d jsonb) returns timestamptz
  language plpgsql security definer set search_path = public as $$
begin
  if nws_rol() is distinct from 'admin' then raise exception 'Solo el admin puede cargar credenciales'; end if;
  if d is null or d = '{}'::jsonb then
    delete from nws_credenciales where marca_id = m and herramienta = h;
    return null;
  end if;
  insert into nws_credenciales (marca_id, herramienta, datos, actualizado_por, actualizado_at)
  values (m, h, d, nws_nombre(), now())
  on conflict (marca_id, herramienta) do update
    set datos = excluded.datos, actualizado_por = excluded.actualizado_por, actualizado_at = now();
  return now();
end $$;

-- Devuelve cuándo se cargó (o null): nunca el contenido.
create or replace function nws_credencial_cargada(m int, h text) returns timestamptz
  language sql stable security definer set search_path = public as $$
  select actualizado_at from nws_credenciales
   where marca_id = m and herramienta = h and nws_puede_ver(m)
$$;

revoke execute on function nws_guardar_credencial(int, text, jsonb) from public, anon;
revoke execute on function nws_credencial_cargada(int, text) from public, anon;
grant execute on function nws_guardar_credencial(int, text, jsonb), nws_credencial_cargada(int, text) to authenticated;

-- ── REGLA NUEVA: con carga automática, aprobar exige el test de esta versión ─
create or replace function nws_news_test_al_dia() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  -- La versión testeada la escribe solo la función de servidor, nunca el navegador.
  if coalesce(auth.role(), '') <> 'service_role' then
    if tg_op = 'INSERT' then
      new.implementado_huella := null; new.implementado_at := null;
    else
      new.implementado_huella := old.implementado_huella; new.implementado_at := old.implementado_at;
    end if;
  end if;

  if new.estado = 'aprobada' and (tg_op = 'INSERT' or old.estado <> 'aprobada')
     and exists (select 1 from nws_cliente_config c where c.marca_id = new.marca_id and c.automatizar)
     and new.implementado_huella is distinct from new.huella then
    raise exception 'El test que se mandó es de otra versión: implementá de nuevo antes de aprobar';
  end if;
  return new;
end $$;

drop trigger if exists nws_news_test_al_dia on nws_news;
create trigger nws_news_test_al_dia before insert or update on nws_news
  for each row execute function nws_news_test_al_dia();
