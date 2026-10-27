-- Coaches Connection - Fase 1 de la Opcion B
-- Esquema reproducible, sincronizacion de Authentication y seguridad base.
-- Puede ejecutarse sobre una base vacia o sobre la estructura anterior.
-- No elimina tablas ni registros existentes.

create extension if not exists pgcrypto;

-- 1. Tipos utilizados por la aplicacion.
do $$
begin
  create type public.rol_usuario as enum ('admin', 'coach');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.estado_usuario as enum ('pendiente', 'activo', 'inactivo', 'rechazado');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.estado_cliente as enum ('Activo', 'En Evaluación', 'Inactivo');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.tipo_documento_identidad as enum ('cedula', 'pasaporte');
exception when duplicate_object then null;
end $$;

-- 2. Tablas principales. El orden evita relaciones circulares.
create table if not exists public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  apellido text not null default '',
  email text not null,
  rol public.rol_usuario not null default 'coach',
  estado public.estado_usuario not null default 'pendiente',
  codigo text not null default ('COACH-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 6))),
  creado_en timestamptz not null default now(),
  telefono text,
  tipo_documento public.tipo_documento_identidad,
  documento text,
  direccion text
);

create table if not exists public.rutinas (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.usuarios(id) on delete cascade,
  nombre text not null,
  nivel text,
  contenido jsonb not null default '[]'::jsonb,
  creado_en timestamptz not null default now()
);

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  apellido text not null default '',
  email text not null,
  telefono text,
  estado public.estado_cliente not null default 'En Evaluación',
  edad integer,
  objetivo text,
  plan text,
  observaciones text,
  coach_id uuid references public.usuarios(id) on delete set null,
  rutina_id uuid references public.rutinas(id) on delete set null,
  rutina_asignada text,
  peso_actual numeric,
  estatura numeric,
  creado_en timestamptz not null default now()
);

create table if not exists public.mediciones (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  coach_id uuid not null references public.usuarios(id) on delete cascade,
  fecha date not null default current_date,
  peso numeric not null,
  estatura numeric not null,
  cintura numeric,
  cadera numeric,
  imc numeric,
  icc numeric,
  creado_en timestamptz not null default now()
);

create table if not exists public.eventos (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.usuarios(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete set null,
  titulo text not null,
  descripcion text,
  inicio timestamptz not null,
  fin timestamptz not null,
  fecha date not null,
  google_event_id text,
  creado_en timestamptz not null default now()
);

create table if not exists public.app_migraciones (
  version text primary key,
  descripcion text not null,
  aplicada_en timestamptz not null default now()
);

-- 3. Compatibilidad con bases creadas antes de esta version.
alter table public.usuarios
  add column if not exists nombre text,
  add column if not exists apellido text default '',
  add column if not exists email text,
  add column if not exists rol public.rol_usuario default 'coach',
  add column if not exists estado public.estado_usuario default 'pendiente',
  add column if not exists codigo text,
  add column if not exists creado_en timestamptz default now(),
  add column if not exists telefono text,
  add column if not exists tipo_documento public.tipo_documento_identidad,
  add column if not exists documento text,
  add column if not exists direccion text;

alter table public.rutinas
  add column if not exists coach_id uuid,
  add column if not exists nombre text,
  add column if not exists nivel text,
  add column if not exists contenido jsonb default '[]'::jsonb,
  add column if not exists creado_en timestamptz default now();

alter table public.rutinas alter column contenido set default '[]'::jsonb;

alter table public.clientes
  add column if not exists nombre text,
  add column if not exists apellido text default '',
  add column if not exists email text,
  add column if not exists telefono text,
  add column if not exists estado public.estado_cliente default 'En Evaluación',
  add column if not exists edad integer,
  add column if not exists objetivo text,
  add column if not exists plan text,
  add column if not exists observaciones text,
  add column if not exists coach_id uuid,
  add column if not exists rutina_id uuid,
  add column if not exists rutina_asignada text,
  add column if not exists peso_actual numeric,
  add column if not exists estatura numeric,
  add column if not exists creado_en timestamptz default now();

alter table public.mediciones
  add column if not exists cliente_id uuid,
  add column if not exists coach_id uuid,
  add column if not exists fecha date default current_date,
  add column if not exists peso numeric,
  add column if not exists estatura numeric,
  add column if not exists cintura numeric,
  add column if not exists cadera numeric,
  add column if not exists imc numeric,
  add column if not exists icc numeric,
  add column if not exists creado_en timestamptz default now();

alter table public.eventos
  add column if not exists coach_id uuid,
  add column if not exists cliente_id uuid,
  add column if not exists titulo text,
  add column if not exists descripcion text,
  add column if not exists inicio timestamptz,
  add column if not exists fin timestamptz,
  add column if not exists fecha date,
  add column if not exists google_event_id text,
  add column if not exists creado_en timestamptz default now();

-- Las relaciones se agregan como NOT VALID para no borrar datos antiguos.
-- Los registros nuevos quedan protegidos inmediatamente.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'usuarios_auth_id_fkey') then
    alter table public.usuarios add constraint usuarios_auth_id_fkey
      foreign key (id) references auth.users(id) on delete cascade not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'rutinas_coach_id_fkey') then
    alter table public.rutinas add constraint rutinas_coach_id_fkey
      foreign key (coach_id) references public.usuarios(id) on delete cascade not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'clientes_coach_id_fkey') then
    alter table public.clientes add constraint clientes_coach_id_fkey
      foreign key (coach_id) references public.usuarios(id) on delete set null not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'clientes_rutina_id_fkey') then
    alter table public.clientes add constraint clientes_rutina_id_fkey
      foreign key (rutina_id) references public.rutinas(id) on delete set null not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'mediciones_cliente_id_fkey') then
    alter table public.mediciones add constraint mediciones_cliente_id_fkey
      foreign key (cliente_id) references public.clientes(id) on delete cascade not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'mediciones_coach_id_fkey') then
    alter table public.mediciones add constraint mediciones_coach_id_fkey
      foreign key (coach_id) references public.usuarios(id) on delete cascade not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'eventos_coach_id_fkey') then
    alter table public.eventos add constraint eventos_coach_id_fkey
      foreign key (coach_id) references public.usuarios(id) on delete cascade not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'eventos_cliente_id_fkey') then
    alter table public.eventos add constraint eventos_cliente_id_fkey
      foreign key (cliente_id) references public.clientes(id) on delete set null not valid;
  end if;
end $$;

-- 4. Funciones de perfiles y diagnostico.
create or replace function public.usuario_activo_con_rol(rol_requerido text default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.usuarios u
    where u.id = auth.uid()
      and lower(u.estado::text) = 'activo'
      and (rol_requerido is null or lower(u.rol::text) = lower(rol_requerido))
  );
$$;

create or replace function public.crear_perfil_desde_auth(
  usuario_id uuid,
  correo text,
  metadatos jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  perfil jsonb := coalesce(metadatos -> 'perfil_aplicacion', '{}'::jsonb);
  rol_solicitado text := lower(coalesce(metadatos -> 'perfil_aplicacion' ->> 'rol', 'coach'));
  tipo_documento_solicitado text := lower(coalesce(metadatos -> 'perfil_aplicacion' ->> 'tipo_documento', 'cedula'));
  nombre_perfil text;
begin
  nombre_perfil := coalesce(
    nullif(trim(perfil ->> 'nombre'), ''),
    nullif(split_part(coalesce(correo, ''), '@', 1), ''),
    'Usuario'
  );

  insert into public.usuarios (
    id, nombre, apellido, email, rol, estado, codigo, telefono,
    tipo_documento, documento, direccion
  ) values (
    usuario_id,
    nombre_perfil,
    coalesce(trim(perfil ->> 'apellido'), ''),
    lower(trim(coalesce(correo, perfil ->> 'email', ''))),
    case
      when rol_solicitado = 'admin' then 'admin'::public.rol_usuario
      else 'coach'::public.rol_usuario
    end,
    'pendiente'::public.estado_usuario,
    coalesce(
      nullif(trim(perfil ->> 'codigo'), ''),
      (case when rol_solicitado = 'admin' then 'ADMIN-' else 'COACH-' end) ||
        upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 6))
    ),
    nullif(trim(perfil ->> 'telefono'), ''),
    case
      when tipo_documento_solicitado = 'pasaporte' then 'pasaporte'::public.tipo_documento_identidad
      else 'cedula'::public.tipo_documento_identidad
    end,
    nullif(trim(perfil ->> 'documento'), ''),
    nullif(trim(perfil ->> 'direccion'), '')
  )
  on conflict (id) do nothing;
end;
$$;

create or replace function public.al_crear_usuario_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.crear_perfil_desde_auth(new.id, new.email, new.raw_user_meta_data);
  return new;
end;
$$;

drop trigger if exists crear_perfil_usuario on auth.users;
create trigger crear_perfil_usuario
after insert on auth.users
for each row execute function public.al_crear_usuario_auth();

create or replace function public.reparar_mi_perfil()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  cuenta auth.users%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Se necesita una sesión autenticada';
  end if;

  select * into cuenta from auth.users where id = auth.uid();
  if not found then
    raise exception 'Cuenta de autenticación no encontrada';
  end if;

  perform public.crear_perfil_desde_auth(cuenta.id, cuenta.email, cuenta.raw_user_meta_data);
end;
$$;

create or replace function public.reparar_perfiles_faltantes()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  cuenta record;
  reparados integer := 0;
begin
  for cuenta in
    select a.id, a.email, a.raw_user_meta_data
    from auth.users a
    left join public.usuarios u on u.id = a.id
    where u.id is null
  loop
    perform public.crear_perfil_desde_auth(cuenta.id, cuenta.email, cuenta.raw_user_meta_data);
    reparados := reparados + 1;
  end loop;
  return reparados;
end;
$$;

create or replace function public.estado_backend()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'aplicacion', 'Coaches Connection',
    'configurado', true,
    'version', coalesce(
      (select m.version from public.app_migraciones m order by m.aplicada_en desc limit 1),
      '1.1.0'
    )
  );
$$;

-- Repara inmediatamente las cuentas que ya estaban en Authentication.
select public.reparar_perfiles_faltantes();

-- 5. Registro transaccional de mediciones.
create or replace function public.registrar_medicion_cliente(
  p_cliente_id uuid,
  p_fecha date,
  p_peso numeric,
  p_estatura numeric,
  p_cintura numeric default null,
  p_cadera numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  medicion_id uuid;
  valor_imc numeric;
  valor_icc numeric;
begin
  if not public.usuario_activo_con_rol('coach') then
    raise exception 'Solo un entrenador activo puede registrar mediciones';
  end if;

  if not exists (
    select 1 from public.clientes
    where id = p_cliente_id and coach_id = auth.uid()
  ) then
    raise exception 'El cliente no pertenece al entrenador autenticado';
  end if;

  if p_peso <= 0 or p_peso > 500 or p_estatura < 50 or p_estatura > 260 then
    raise exception 'Medición fuera de los límites permitidos';
  end if;
  if p_cintura is not null and (p_cintura <= 0 or p_cintura > 300) then
    raise exception 'Cintura fuera de los límites permitidos';
  end if;
  if p_cadera is not null and (p_cadera <= 0 or p_cadera > 300) then
    raise exception 'Cadera fuera de los límites permitidos';
  end if;

  valor_imc := round(p_peso / power(p_estatura / 100, 2), 1);
  valor_icc := case when p_cintura is not null and p_cadera is not null
    then round(p_cintura / p_cadera, 2) else null end;

  insert into public.mediciones (
    cliente_id, coach_id, fecha, peso, estatura, cintura, cadera, imc, icc
  ) values (
    p_cliente_id, auth.uid(), p_fecha, p_peso, p_estatura,
    p_cintura, p_cadera, valor_imc, valor_icc
  ) returning id into medicion_id;

  update public.clientes
  set peso_actual = p_peso, estatura = p_estatura
  where id = p_cliente_id and coach_id = auth.uid();

  return medicion_id;
end;
$$;

-- 6. Indices. Los unicos no detienen la instalacion si existen duplicados antiguos.
create index if not exists clientes_coach_id_idx on public.clientes(coach_id);
create index if not exists rutinas_coach_id_idx on public.rutinas(coach_id);
create index if not exists mediciones_cliente_id_idx on public.mediciones(cliente_id);
create index if not exists mediciones_coach_id_idx on public.mediciones(coach_id);
create index if not exists eventos_coach_fecha_idx on public.eventos(coach_id, fecha);
create index if not exists eventos_cliente_id_idx on public.eventos(cliente_id);

do $$
begin
  if not exists (
    select 1 from public.clientes
    where email is not null
    group by coach_id, lower(email)
    having count(*) > 1
  ) then
    create unique index if not exists clientes_coach_email_unico_idx
      on public.clientes(coach_id, lower(email));
  else
    raise warning 'No se creó clientes_coach_email_unico_idx porque existen correos duplicados por entrenador';
  end if;

  if not exists (
    select 1 from public.rutinas
    where nombre is not null
    group by coach_id, lower(nombre)
    having count(*) > 1
  ) then
    create unique index if not exists rutinas_coach_nombre_unico_idx
      on public.rutinas(coach_id, lower(nombre));
  else
    raise warning 'No se creó rutinas_coach_nombre_unico_idx porque existen nombres duplicados por entrenador';
  end if;
end $$;

-- 7. Politicas RLS.
do $$
declare
  politica record;
begin
  for politica in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('usuarios', 'clientes', 'rutinas', 'mediciones', 'eventos', 'app_migraciones')
  loop
    execute format('drop policy if exists %I on %I.%I', politica.policyname, politica.schemaname, politica.tablename);
  end loop;
end $$;

alter table public.usuarios enable row level security;
alter table public.clientes enable row level security;
alter table public.rutinas enable row level security;
alter table public.mediciones enable row level security;
alter table public.eventos enable row level security;
alter table public.app_migraciones enable row level security;

create policy usuarios_leer on public.usuarios
for select to authenticated
using (id = auth.uid() or public.usuario_activo_con_rol('admin'));

create policy usuarios_actualizar_admin on public.usuarios
for update to authenticated
using (public.usuario_activo_con_rol('admin'))
with check (public.usuario_activo_con_rol('admin'));

create policy clientes_leer on public.clientes
for select to authenticated
using (public.usuario_activo_con_rol('admin') or (public.usuario_activo_con_rol('coach') and coach_id = auth.uid()));
create policy clientes_insertar on public.clientes
for insert to authenticated
with check (public.usuario_activo_con_rol('admin') or (public.usuario_activo_con_rol('coach') and coach_id = auth.uid()));
create policy clientes_actualizar on public.clientes
for update to authenticated
using (public.usuario_activo_con_rol('admin') or (public.usuario_activo_con_rol('coach') and coach_id = auth.uid()))
with check (public.usuario_activo_con_rol('admin') or (public.usuario_activo_con_rol('coach') and coach_id = auth.uid()));
create policy clientes_eliminar on public.clientes
for delete to authenticated
using (public.usuario_activo_con_rol('admin') or (public.usuario_activo_con_rol('coach') and coach_id = auth.uid()));

create policy rutinas_leer on public.rutinas
for select to authenticated
using (public.usuario_activo_con_rol('admin') or (public.usuario_activo_con_rol('coach') and coach_id = auth.uid()));
create policy rutinas_insertar on public.rutinas
for insert to authenticated
with check (public.usuario_activo_con_rol('coach') and coach_id = auth.uid());
create policy rutinas_actualizar on public.rutinas
for update to authenticated
using (public.usuario_activo_con_rol('coach') and coach_id = auth.uid())
with check (public.usuario_activo_con_rol('coach') and coach_id = auth.uid());
create policy rutinas_eliminar on public.rutinas
for delete to authenticated
using (public.usuario_activo_con_rol('coach') and coach_id = auth.uid());

create policy mediciones_leer on public.mediciones
for select to authenticated
using (public.usuario_activo_con_rol('admin') or (public.usuario_activo_con_rol('coach') and coach_id = auth.uid()));

create policy eventos_leer on public.eventos
for select to authenticated
using (public.usuario_activo_con_rol('admin') or (public.usuario_activo_con_rol('coach') and coach_id = auth.uid()));
create policy eventos_insertar on public.eventos
for insert to authenticated
with check (public.usuario_activo_con_rol('coach') and coach_id = auth.uid());
create policy eventos_actualizar on public.eventos
for update to authenticated
using (public.usuario_activo_con_rol('coach') and coach_id = auth.uid())
with check (public.usuario_activo_con_rol('coach') and coach_id = auth.uid());
create policy eventos_eliminar on public.eventos
for delete to authenticated
using (public.usuario_activo_con_rol('coach') and coach_id = auth.uid());

-- 8. Permisos explicitos.
revoke all on public.usuarios, public.clientes, public.rutinas, public.mediciones,
  public.eventos, public.app_migraciones from anon;
grant select, update on public.usuarios to authenticated;
grant select, insert, update, delete on public.clientes, public.rutinas, public.eventos to authenticated;
grant select on public.mediciones to authenticated;

revoke all on function public.crear_perfil_desde_auth(uuid, text, jsonb) from public;
revoke all on function public.al_crear_usuario_auth() from public;
revoke all on function public.reparar_mi_perfil() from public;
revoke all on function public.reparar_perfiles_faltantes() from public;
revoke all on function public.registrar_medicion_cliente(uuid, date, numeric, numeric, numeric, numeric) from public;
revoke all on function public.usuario_activo_con_rol(text) from public;
revoke all on function public.estado_backend() from public;

grant execute on function public.reparar_mi_perfil() to authenticated;
grant execute on function public.registrar_medicion_cliente(uuid, date, numeric, numeric, numeric, numeric) to authenticated;
grant execute on function public.usuario_activo_con_rol(text) to authenticated;
grant execute on function public.estado_backend() to anon, authenticated;

insert into public.app_migraciones (version, descripcion)
values ('1.1.0', 'Fase 1: esquema reproducible, perfiles y diagnostico')
on conflict (version) do update set descripcion = excluded.descripcion;

-- 9. Activa los cambios en tiempo real utilizados por los paneles.
do $$
declare
  tabla text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach tabla in array array['usuarios', 'clientes', 'rutinas', 'mediciones', 'eventos']
    loop
      if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = tabla
      ) then
        execute format('alter publication supabase_realtime add table public.%I', tabla);
      end if;
    end loop;
  end if;
end $$;

-- Pide a la API de Supabase que reconozca inmediatamente las funciones nuevas.
notify pgrst, 'reload schema';

-- IMPORTANTE:
-- Si todavía no existe un administrador activo, ejecuta después del setup:
-- update public.usuarios
-- set rol = 'admin', estado = 'activo'
-- where lower(email) = lower('CORREO-DEL-ADMINISTRADOR');
