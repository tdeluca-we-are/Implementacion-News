-- ═══════════════════════════════════════════════════════════════════════════
-- WE ARE — Implementación de news (hub)
--
-- El analista carga la news (input estándar + HTML de Atlas o piezas JPG/PNG),
-- el hub la valida y arma el HTML final, alguien la aprueba y después se carga
-- en la herramienta del cliente (hoy con el kit; por API cuando haya credencial).
--
-- Correr DESPUÉS de semaforo-schema.sql (necesita sem_marcas).
-- Todo con prefijo nws_. Se puede correr más de una vez.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── USUARIOS ────────────────────────────────────────────────────────────────
-- Mismo criterio que Briefs y el calendario: se autoriza el mail y la cuenta se
-- vincula sola en el primer login (la cuenta se crea en Authentication → Users).
--   admin  : todo (todas las marcas, configuración de clientes, accesos)
--   editor : carga, edita y aprueba news de sus marcas
--   lector : ve las news de sus marcas
create table if not exists nws_usuarios (
  id             serial primary key,
  email          text not null,
  nombre         text,
  rol            text not null default 'lector' check (rol in ('admin','editor','lector')),
  activo         boolean not null default true,
  user_id        uuid,
  ultimo_ingreso timestamptz
);
create unique index if not exists nws_usuarios_email_idx on nws_usuarios (lower(email));
create unique index if not exists nws_usuarios_uid_idx   on nws_usuarios (user_id) where user_id is not null;

create table if not exists nws_usuario_marcas (
  usuario_id int not null references nws_usuarios(id) on delete cascade,
  marca_id   int not null references sem_marcas(id)   on delete cascade,
  primary key (usuario_id, marca_id)
);

insert into nws_usuarios (email, nombre, rol) values
  ('tdeluca@we-are.com.ar', 'Tomás De Luca', 'admin')
on conflict do nothing;

-- ── CONFIGURACIÓN POR CLIENTE ───────────────────────────────────────────────
-- Es el mapeo cliente → herramienta → cuenta → segmentos/remitentes que en la
-- CLI vive en config/clientes.json. La edita el admin.
create table if not exists nws_cliente_config (
  marca_id           int primary key references sem_marcas(id) on delete cascade,
  herramienta        text not null default 'woowup'
                     check (herramienta in ('woowup','icomm','marketingnube','connectif')),
  cuenta             text not null default '',          -- slug o id de la cuenta en la herramienta
  remitentes         jsonb not null default '[]'::jsonb, -- [{nombre, email}]
  dominios_remitente text[] not null default '{}',       -- dominios autenticados para enviar
  segmentos          jsonb not null default '{}'::jsonb, -- {alias: {id, nombre, tamano}}
  utm                jsonb not null default '{"source":"","medium":"email"}'::jsonb,
  dominios_sitio     text[] not null default '{}',       -- a estos links se les agrega UTM
  automatizar        boolean not null default false,     -- carga por API (requiere credencial)
  extra              jsonb not null default '{}'::jsonb, -- ej. {"woowup":{"servicio":12}}
  notas              text,
  actualizado_por    text,
  actualizado_at     timestamptz not null default now()
);

-- ── NEWS ────────────────────────────────────────────────────────────────────
-- input = el input estándar (sin el contenido). html = HTML original de Atlas.
-- piezas = [{path, url, archivo, alt, link, ancho, alto, bytes, sha}] en orden.
-- huella = hash de lo que sale al cliente: la aprobación queda atada a ella.
create table if not exists nws_news (
  id              serial primary key,
  marca_id        int  not null references sem_marcas(id) on delete cascade,
  nombre          text not null default '',
  fecha_envio     text,                 -- YYYY-MM-DD (hora Argentina), como texto
  hora_envio      text,                 -- HH:MM
  estado          text not null default 'borrador'
                  check (estado in ('borrador','lista','aprobada','cargada','cancelada')),
  input           jsonb not null default '{}'::jsonb,
  contenido       text not null default 'piezas' check (contenido in ('html','piezas')),
  html            text,
  piezas          jsonb not null default '[]'::jsonb,
  html_final      text,
  huella          text,
  n_errores       int not null default 0,
  n_avisos        int not null default 0,
  aprobado_por    text,
  aprobado_at     timestamptz,
  aprobado_huella text,
  cargado_por     text,
  cargado_at      timestamptz,
  id_externo      text,                 -- id de la campaña en la herramienta
  creado_por      text,
  creado_at       timestamptz not null default now(),
  actualizado_por text,
  actualizado_at  timestamptz not null default now()
);
create index if not exists nws_news_marca_idx on nws_news (marca_id, actualizado_at desc);

-- ── REGISTRO ────────────────────────────────────────────────────────────────
create table if not exists nws_eventos (
  id       bigserial primary key,
  news_id  int not null references nws_news(id) on delete cascade,
  marca_id int not null,
  en       timestamptz not null default now(),
  usuario  text,
  accion   text not null,
  detalle  text
);
create index if not exists nws_eventos_news_idx on nws_eventos (news_id, en desc);

-- ── IDENTIDAD Y PERMISOS ────────────────────────────────────────────────────
create or replace function nws_email() returns text
  language sql stable security definer set search_path = public, auth as $$
  select lower(email) from auth.users where id = auth.uid()
$$;

create or replace function nws_yo() returns nws_usuarios
  language sql stable security definer set search_path = public as $$
  select * from nws_usuarios
   where activo and (user_id = auth.uid() or lower(email) = nws_email())
   limit 1
$$;

create or replace function nws_rol() returns text
  language sql stable security definer set search_path = public as $$ select (nws_yo()).rol $$;

create or replace function nws_nombre() returns text
  language sql stable security definer set search_path = public as $$
  select coalesce((nws_yo()).nombre, (nws_yo()).email) $$;

create or replace function nws_puede_ver(m int) returns boolean
  language sql stable security definer set search_path = public as $$
  select nws_rol() = 'admin'
      or (nws_rol() is not null and exists (
            select 1 from nws_usuario_marcas um where um.usuario_id = (nws_yo()).id and um.marca_id = m))
$$;

create or replace function nws_puede_editar(m int) returns boolean
  language sql stable security definer set search_path = public as $$
  select nws_rol() = 'admin'
      or (nws_rol() = 'editor' and exists (
            select 1 from nws_usuario_marcas um where um.usuario_id = (nws_yo()).id and um.marca_id = m))
$$;

create or replace function nws_vincular() returns setof nws_usuarios
  language plpgsql security definer set search_path = public as $$
begin
  update nws_usuarios set user_id = auth.uid(), ultimo_ingreso = now()
   where activo and lower(email) = nws_email() and (user_id is null or user_id = auth.uid());
  return query select * from nws_usuarios
   where activo and (user_id = auth.uid() or lower(email) = nws_email()) limit 1;
end $$;

grant execute on function nws_email(), nws_yo(), nws_rol(), nws_nombre(),
                          nws_puede_ver(int), nws_puede_editar(int), nws_vincular() to authenticated;

-- ── REGLAS DEL FLUJO (en la base, no solo en la pantalla) ───────────────────
-- 1. "lista" y "aprobada" solo sin errores de validación.
-- 2. Aprobar exige que la huella aprobada sea la actual.
-- 3. Si cambia la huella de una news aprobada o cargada, vuelve a "lista"
--    (o "borrador" si tiene errores) y se borra la aprobación.
-- 4. "cargada" solo desde "aprobada".
create or replace function nws_news_reglas() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  new.actualizado_at := now();
  new.actualizado_por := coalesce(nws_nombre(), new.actualizado_por);

  if tg_op = 'UPDATE' and old.estado in ('aprobada','cargada')
     and new.huella is distinct from old.huella then
    new.estado := case when new.n_errores = 0 then 'lista' else 'borrador' end;
    new.aprobado_por := null; new.aprobado_at := null; new.aprobado_huella := null;
    new.cargado_por := null;  new.cargado_at := null;
    return new;
  end if;

  if new.estado in ('lista','aprobada') and new.n_errores > 0 then
    raise exception 'La news tiene % error(es) de validación: no puede pasar a %', new.n_errores, new.estado;
  end if;

  if new.estado = 'aprobada' and (tg_op = 'INSERT' or old.estado <> 'aprobada') then
    if new.aprobado_huella is distinct from new.huella then
      raise exception 'La huella aprobada no es la actual: revisá la news de nuevo antes de aprobar';
    end if;
    new.aprobado_por := nws_nombre(); new.aprobado_at := now();
  end if;

  if new.estado = 'cargada' and (tg_op = 'INSERT' or old.estado <> 'cargada') then
    if tg_op = 'INSERT' or old.estado <> 'aprobada' then
      raise exception 'Solo se puede marcar como cargada una news aprobada';
    end if;
    new.cargado_por := nws_nombre(); new.cargado_at := now();
  end if;
  return new;
end $$;

drop trigger if exists nws_news_reglas on nws_news;
create trigger nws_news_reglas before insert or update on nws_news
  for each row execute function nws_news_reglas();

create or replace function nws_news_registro() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into nws_eventos (news_id, marca_id, usuario, accion) values (new.id, new.marca_id, nws_nombre(), 'creada');
  elsif new.estado is distinct from old.estado then
    insert into nws_eventos (news_id, marca_id, usuario, accion, detalle)
    values (new.id, new.marca_id, nws_nombre(), new.estado,
            case when old.estado in ('aprobada','cargada') and new.huella is distinct from old.huella
                 then 'cambió el contenido: se cayó la aprobación' end);
  elsif new.huella is distinct from old.huella then
    insert into nws_eventos (news_id, marca_id, usuario, accion) values (new.id, new.marca_id, nws_nombre(), 'editada');
  end if;
  return null;
end $$;

drop trigger if exists nws_news_registro on nws_news;
create trigger nws_news_registro after insert or update on nws_news
  for each row execute function nws_news_registro();

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table nws_usuarios       enable row level security;
alter table nws_usuario_marcas enable row level security;
alter table nws_cliente_config enable row level security;
alter table nws_news           enable row level security;
alter table nws_eventos        enable row level security;

drop policy if exists nws_news_read on nws_news;
create policy nws_news_read on nws_news for select to authenticated using (nws_puede_ver(marca_id));
drop policy if exists nws_news_write on nws_news;
create policy nws_news_write on nws_news for all to authenticated
  using (nws_puede_editar(marca_id)) with check (nws_puede_editar(marca_id));

drop policy if exists nws_eventos_read on nws_eventos;
create policy nws_eventos_read on nws_eventos for select to authenticated using (nws_puede_ver(marca_id));
drop policy if exists nws_eventos_insert on nws_eventos;
create policy nws_eventos_insert on nws_eventos for insert to authenticated with check (nws_puede_editar(marca_id));

-- Configuración de clientes: la ven quienes tienen la marca; la edita el admin.
drop policy if exists nws_cfg_read on nws_cliente_config;
create policy nws_cfg_read on nws_cliente_config for select to authenticated using (nws_puede_ver(marca_id));
drop policy if exists nws_cfg_admin on nws_cliente_config;
create policy nws_cfg_admin on nws_cliente_config for all to authenticated
  using (nws_rol() = 'admin') with check (nws_rol() = 'admin');

drop policy if exists nws_usuarios_self on nws_usuarios;
create policy nws_usuarios_self on nws_usuarios for select to authenticated
  using (user_id = auth.uid() or lower(email) = nws_email() or nws_rol() = 'admin');
drop policy if exists nws_usuarios_admin on nws_usuarios;
create policy nws_usuarios_admin on nws_usuarios for all to authenticated
  using (nws_rol() = 'admin') with check (nws_rol() = 'admin');

drop policy if exists nws_um_read on nws_usuario_marcas;
create policy nws_um_read on nws_usuario_marcas for select to authenticated
  using (nws_rol() = 'admin' or usuario_id = (nws_yo()).id);
drop policy if exists nws_um_admin on nws_usuario_marcas;
create policy nws_um_admin on nws_usuario_marcas for all to authenticated
  using (nws_rol() = 'admin') with check (nws_rol() = 'admin');

-- Marcas del semáforo: lectura para quien tenga la marca en el hub (se suma con
-- OR a las políticas del semáforo, calendario y briefs).
drop policy if exists sem_marcas_nws_read on sem_marcas;
create policy sem_marcas_nws_read on sem_marcas for select to authenticated using (nws_puede_ver(id));

-- ── IMÁGENES DE LAS PIEZAS ──────────────────────────────────────────────────
-- Bucket público de lectura: el mail final apunta a estas URLs. Ruta:
-- <marca_id>/<news_id>/<archivo>. Sube y borra quien puede editar la marca.
insert into storage.buckets (id, name, public)
values ('nws-piezas', 'nws-piezas', true)
on conflict (id) do update set public = true;

drop policy if exists nws_img_read on storage.objects;
create policy nws_img_read on storage.objects for select to public using (bucket_id = 'nws-piezas');
drop policy if exists nws_img_write on storage.objects;
create policy nws_img_write on storage.objects for insert to authenticated
  with check (bucket_id = 'nws-piezas' and nws_puede_editar(((storage.foldername(name))[1])::int));
drop policy if exists nws_img_delete on storage.objects;
create policy nws_img_delete on storage.objects for delete to authenticated
  using (bucket_id = 'nws-piezas' and nws_puede_editar(((storage.foldername(name))[1])::int));
