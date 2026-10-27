-- Coaches Connection - Fase 3 de la Opcion B
-- Sesiones, asistencia, historial de rutinas, portal del cliente y consentimiento.
-- Requisitos: ejecutar primero setup.sql y fase2_seguridad.sql.
-- No elimina tablas ni registros existentes.

begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- 1. Cuentas de portal e invitaciones para clientes ya registrados.
create table if not exists public.cuentas_clientes (
  id uuid primary key default extensions.gen_random_uuid(),
  usuario_id uuid not null unique references auth.users(id) on delete cascade,
  cliente_id uuid not null unique references public.clientes(id) on delete cascade,
  estado text not null default 'activo' check (estado in ('activo', 'inactivo')),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table if not exists public.invitaciones_clientes (
  id uuid primary key default extensions.gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'utilizada', 'revocada', 'vencida')),
  creado_por uuid not null references public.usuarios(id) on delete restrict,
  usado_por uuid references auth.users(id) on delete set null,
  creado_en timestamptz not null default now(),
  vence_en timestamptz not null,
  usado_en timestamptz,
  revocado_en timestamptz
);

create index if not exists invitaciones_clientes_cliente_idx
  on public.invitaciones_clientes(cliente_id, estado);
create index if not exists invitaciones_clientes_email_idx
  on public.invitaciones_clientes(lower(email));

-- 2. Sesiones y asistencia.
create table if not exists public.sesiones_entrenamiento (
  id uuid primary key default extensions.gen_random_uuid(),
  coach_id uuid not null references public.usuarios(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  rutina_id uuid references public.rutinas(id) on delete set null,
  evento_id uuid unique references public.eventos(id) on delete set null,
  titulo text not null,
  inicio timestamptz not null,
  fin timestamptz not null,
  estado text not null default 'programada'
    check (estado in ('programada', 'completada', 'cancelada')),
  asistencia text not null default 'pendiente'
    check (asistencia in ('pendiente', 'presente', 'ausente', 'justificada')),
  observaciones text,
  finalizada_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint sesiones_rango_valido check (fin > inicio),
  constraint sesiones_duracion_valida check (fin <= inicio + interval '8 hours')
);

create index if not exists sesiones_coach_inicio_idx
  on public.sesiones_entrenamiento(coach_id, inicio desc);
create index if not exists sesiones_cliente_inicio_idx
  on public.sesiones_entrenamiento(cliente_id, inicio desc);
create index if not exists sesiones_estado_idx
  on public.sesiones_entrenamiento(estado, asistencia);

-- 3. Historial inalterable de las rutinas asignadas.
create table if not exists public.historial_rutinas (
  id uuid primary key default extensions.gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  coach_id uuid not null references public.usuarios(id) on delete cascade,
  rutina_id uuid references public.rutinas(id) on delete set null,
  nombre_rutina text not null,
  nivel text,
  contenido jsonb not null default '[]'::jsonb,
  estado text not null default 'activa'
    check (estado in ('activa', 'finalizada', 'cancelada')),
  asignada_en timestamptz not null default now(),
  finalizada_en timestamptz
);

create index if not exists historial_rutinas_cliente_idx
  on public.historial_rutinas(cliente_id, asignada_en desc);
create index if not exists historial_rutinas_coach_idx
  on public.historial_rutinas(coach_id, asignada_en desc);
create unique index if not exists historial_rutina_activa_cliente_idx
  on public.historial_rutinas(cliente_id)
  where estado = 'activa';

-- 4. Consentimientos. Cada cambio conserva una evidencia histórica.
create table if not exists public.consentimientos_datos (
  id uuid primary key default extensions.gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  tipo text not null check (tipo in ('tratamiento_datos', 'seguimiento_corporal')),
  estado text not null check (estado in ('otorgado', 'revocado')),
  version_documento text not null default '1.0',
  origen text not null default 'portal_cliente'
    check (origen in ('portal_cliente', 'registro_institucional')),
  registrado_por uuid not null references auth.users(id) on delete restrict,
  otorgado_en timestamptz,
  revocado_en timestamptz,
  creado_en timestamptz not null default now()
);

create index if not exists consentimientos_cliente_tipo_idx
  on public.consentimientos_datos(cliente_id, tipo, creado_en desc);

-- 5. Funciones de identidad del portal.
create or replace function public.cliente_id_actual()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select cc.cliente_id
  from public.cuentas_clientes cc
  where cc.usuario_id = auth.uid()
    and cc.estado = 'activo'
  limit 1;
$$;

create or replace function public.usuario_es_cliente_activo()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.cliente_id_actual() is not null;
$$;

create or replace function public.cliente_puede_ver_rutina(p_rutina_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.clientes c
    where c.id = public.cliente_id_actual()
      and (
        c.rutina_id = p_rutina_id
        or exists (
          select 1 from public.historial_rutinas h
          where h.cliente_id = c.id and h.rutina_id = p_rutina_id
        )
        or exists (
          select 1 from public.sesiones_entrenamiento s
          where s.cliente_id = c.id and s.rutina_id = p_rutina_id
        )
      )
  );
$$;

create or replace function public.obtener_mi_perfil_cliente()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', cc.usuario_id,
    'cliente_id', c.id,
    'nombre', c.nombre,
    'apellido', c.apellido,
    'email', c.email,
    'telefono', c.telefono,
    'rol', 'cliente',
    'estado', cc.estado,
    'coach_id', c.coach_id,
    'rutina_id', c.rutina_id,
    'coach_nombre', trim(coalesce(u.nombre, '') || ' ' || coalesce(u.apellido, '')),
    'creado_en', cc.creado_en
  )
  from public.cuentas_clientes cc
  join public.clientes c on c.id = cc.cliente_id
  left join public.usuarios u on u.id = c.coach_id
  where cc.usuario_id = auth.uid()
  limit 1;
$$;

-- 6. Invitaciones de clientes creadas por su entrenador.
create or replace function public.crear_invitacion_cliente(
  p_cliente_id uuid,
  p_dias_vigencia integer default 7
)
returns table(invitacion_id uuid, codigo text, vence_en timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  cliente_objetivo public.clientes%rowtype;
  codigo_generado text;
  id_generado uuid;
  fecha_vencimiento timestamptz;
begin
  if not public.usuario_activo_con_rol('coach') then
    raise exception 'Solo un entrenador activo puede invitar clientes';
  end if;
  if p_dias_vigencia < 1 or p_dias_vigencia > 30 then
    raise exception 'La vigencia debe estar entre 1 y 30 dias';
  end if;

  select * into cliente_objetivo
  from public.clientes
  where id = p_cliente_id and coach_id = auth.uid()
  for update;

  if not found then raise exception 'El cliente no pertenece al entrenador autenticado'; end if;
  if lower(trim(coalesce(cliente_objetivo.email, ''))) !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' then
    raise exception 'El cliente no tiene un correo valido';
  end if;
  if exists (select 1 from public.cuentas_clientes where cliente_id = p_cliente_id) then
    raise exception 'El cliente ya tiene acceso al portal';
  end if;

  update public.invitaciones_clientes as i
  set estado = 'vencida'
  where i.estado = 'pendiente' and i.vence_en <= now();

  update public.invitaciones_clientes as i
  set estado = 'revocada', revocado_en = now()
  where i.cliente_id = p_cliente_id and i.estado = 'pendiente';

  codigo_generado := 'CLI-' || upper(encode(extensions.gen_random_bytes(8), 'hex'));
  fecha_vencimiento := now() + make_interval(days => p_dias_vigencia);

  insert into public.invitaciones_clientes (
    cliente_id, email, token_hash, creado_por, vence_en
  ) values (
    p_cliente_id,
    lower(trim(cliente_objetivo.email)),
    encode(extensions.digest(convert_to(codigo_generado, 'UTF8'), 'sha256'), 'hex'),
    auth.uid(),
    fecha_vencimiento
  ) returning id into id_generado;

  return query select id_generado, codigo_generado, fecha_vencimiento;
end;
$$;

create or replace function public.validar_invitacion_cliente(
  p_email text,
  p_codigo text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.invitaciones_clientes i
    where lower(i.email) = lower(trim(coalesce(p_email, '')))
      and i.token_hash = encode(
        extensions.digest(convert_to(upper(trim(coalesce(p_codigo, ''))), 'UTF8'), 'sha256'),
        'hex'
      )
      and i.estado = 'pendiente'
      and i.vence_en > now()
      and not exists (
        select 1 from public.cuentas_clientes cc where cc.cliente_id = i.cliente_id
      )
  );
$$;

create or replace function public.revocar_invitacion_cliente(p_invitacion_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.usuario_activo_con_rol('coach') then
    raise exception 'Solo un entrenador activo puede revocar invitaciones';
  end if;

  update public.invitaciones_clientes i
  set estado = 'revocada', revocado_en = now()
  where i.id = p_invitacion_id
    and i.creado_por = auth.uid()
    and i.estado = 'pendiente';

  return found;
end;
$$;

create or replace function public.cambiar_estado_portal_cliente(
  p_cliente_id uuid,
  p_estado text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  estado_nuevo text := lower(trim(coalesce(p_estado, '')));
begin
  if estado_nuevo not in ('activo', 'inactivo') then
    raise exception 'Estado de portal no permitido';
  end if;
  if not (
    public.usuario_activo_con_rol('admin')
    or exists (
      select 1 from public.clientes c
      where c.id = p_cliente_id
        and c.coach_id = auth.uid()
        and public.usuario_activo_con_rol('coach')
    )
  ) then
    raise exception 'No tienes permiso para cambiar este portal';
  end if;

  update public.cuentas_clientes
  set estado = estado_nuevo, actualizado_en = now()
  where cliente_id = p_cliente_id;
  return found;
end;
$$;

-- 7. Sincronizacion de Authentication para personal y clientes.
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
  rol_meta text := lower(coalesce(metadatos -> 'perfil_aplicacion' ->> 'rol', 'coach'));
  tipo_documento_meta text := lower(coalesce(metadatos -> 'perfil_aplicacion' ->> 'tipo_documento', 'cedula'));
  codigo_admin text := upper(trim(coalesce(metadatos -> 'perfil_aplicacion' ->> 'codigo_invitacion_admin', '')));
  codigo_cliente text := upper(trim(coalesce(metadatos -> 'perfil_aplicacion' ->> 'codigo_invitacion_cliente', '')));
  correo_normalizado text := lower(trim(coalesce(correo, perfil ->> 'email', '')));
  rol_pedido public.rol_usuario := 'coach'::public.rol_usuario;
  invitacion_id uuid;
  cliente_invitado_id uuid;
  nombre_perfil text;
begin
  if exists (
    select 1 from public.usuarios u
    where u.id = crear_perfil_desde_auth.usuario_id
  )
    or exists (
      select 1 from public.cuentas_clientes cc
      where cc.usuario_id = crear_perfil_desde_auth.usuario_id
    ) then
    return;
  end if;

  if rol_meta = 'cliente' then
    select i.id, i.cliente_id into invitacion_id, cliente_invitado_id
    from public.invitaciones_clientes i
    where lower(i.email) = correo_normalizado
      and i.token_hash = encode(
        extensions.digest(convert_to(codigo_cliente, 'UTF8'), 'sha256'),
        'hex'
      )
      and i.estado = 'pendiente'
      and i.vence_en > now()
      and not exists (
        select 1 from public.cuentas_clientes cc where cc.cliente_id = i.cliente_id
      )
    for update;

    if invitacion_id is null then raise exception 'INVITACION_CLIENTE_INVALIDA'; end if;

    insert into public.cuentas_clientes (usuario_id, cliente_id, estado)
    values (usuario_id, cliente_invitado_id, 'activo');

    update public.invitaciones_clientes
    set estado = 'utilizada', usado_por = usuario_id, usado_en = now()
    where id = invitacion_id;
    return;
  end if;

  nombre_perfil := coalesce(
    nullif(trim(perfil ->> 'nombre'), ''),
    nullif(split_part(correo_normalizado, '@', 1), ''),
    'Usuario'
  );

  if rol_meta = 'admin' then
    select i.id into invitacion_id
    from public.invitaciones_admin i
    where lower(i.email) = correo_normalizado
      and i.token_hash = encode(
        extensions.digest(convert_to(codigo_admin, 'UTF8'), 'sha256'),
        'hex'
      )
      and i.estado = 'pendiente'
      and i.vence_en > now()
    for update;

    if invitacion_id is null then raise exception 'INVITACION_ADMIN_INVALIDA'; end if;
    rol_pedido := 'admin'::public.rol_usuario;
  end if;

  insert into public.usuarios (
    id, nombre, apellido, email, rol, rol_solicitado, estado, codigo,
    telefono, tipo_documento, documento, direccion
  ) values (
    usuario_id,
    nombre_perfil,
    coalesce(trim(perfil ->> 'apellido'), ''),
    correo_normalizado,
    'coach'::public.rol_usuario,
    rol_pedido,
    'pendiente'::public.estado_usuario,
    coalesce(
      nullif(trim(perfil ->> 'codigo'), ''),
      (case when rol_pedido = 'admin' then 'ADMIN-' else 'COACH-' end) ||
        upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 6))
    ),
    nullif(trim(perfil ->> 'telefono'), ''),
    case
      when tipo_documento_meta = 'pasaporte' then 'pasaporte'::public.tipo_documento_identidad
      else 'cedula'::public.tipo_documento_identidad
    end,
    nullif(trim(perfil ->> 'documento'), ''),
    nullif(trim(perfil ->> 'direccion'), '')
  );

  if invitacion_id is not null then
    update public.invitaciones_admin
    set estado = 'utilizada', usado_por = usuario_id, usado_en = now()
    where id = invitacion_id;
  end if;
end;
$$;

create or replace function public.reparar_mi_perfil()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  cuenta auth.users%rowtype;
begin
  if auth.uid() is null then raise exception 'Se necesita una sesion autenticada'; end if;
  if exists (select 1 from public.usuarios where id = auth.uid())
    or exists (select 1 from public.cuentas_clientes where usuario_id = auth.uid()) then
    return;
  end if;

  select * into cuenta from auth.users where id = auth.uid();
  if not found then raise exception 'Cuenta de autenticacion no encontrada'; end if;
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
    left join public.cuentas_clientes cc on cc.usuario_id = a.id
    where u.id is null and cc.usuario_id is null
  loop
    begin
      perform public.crear_perfil_desde_auth(cuenta.id, cuenta.email, cuenta.raw_user_meta_data);
      reparados := reparados + 1;
    exception when others then
      raise warning 'No se pudo reparar la cuenta %: %', cuenta.id, sqlerrm;
    end;
  end loop;
  return reparados;
end;
$$;

-- 8. Historial automatico y asignacion segura de rutinas.
create or replace function public.registrar_historial_rutina()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rutina_actual public.rutinas%rowtype;
begin
  if tg_op = 'UPDATE' and new.rutina_id is not distinct from old.rutina_id then return new; end if;

  update public.historial_rutinas
  set estado = 'finalizada', finalizada_en = now()
  where cliente_id = new.id and estado = 'activa';

  if new.rutina_id is not null then
    select * into rutina_actual from public.rutinas where id = new.rutina_id;
    if not found then raise exception 'La rutina asignada no existe'; end if;

    insert into public.historial_rutinas (
      cliente_id, coach_id, rutina_id, nombre_rutina, nivel, contenido
    ) values (
      new.id, new.coach_id, rutina_actual.id, rutina_actual.nombre,
      rutina_actual.nivel, rutina_actual.contenido
    );
  end if;
  return new;
end;
$$;

drop trigger if exists historial_asignacion_rutina on public.clientes;
create trigger historial_asignacion_rutina
after insert or update of rutina_id on public.clientes
for each row execute function public.registrar_historial_rutina();

insert into public.historial_rutinas (
  cliente_id, coach_id, rutina_id, nombre_rutina, nivel, contenido, asignada_en
)
select c.id, c.coach_id, r.id, r.nombre, r.nivel, r.contenido, coalesce(c.creado_en, now())
from public.clientes c
join public.rutinas r on r.id = c.rutina_id and r.coach_id = c.coach_id
where c.coach_id is not null
  and not exists (
    select 1 from public.historial_rutinas h
    where h.cliente_id = c.id and h.estado = 'activa'
  );

create or replace function public.asignar_rutina_cliente(
  p_cliente_id uuid,
  p_rutina_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  nombre_rutina text;
begin
  if not public.usuario_activo_con_rol('coach') then
    raise exception 'Solo un entrenador activo puede asignar rutinas';
  end if;
  if not exists (
    select 1 from public.clientes where id = p_cliente_id and coach_id = auth.uid()
  ) then
    raise exception 'El cliente no pertenece al entrenador autenticado';
  end if;

  if p_rutina_id is not null then
    select nombre into nombre_rutina
    from public.rutinas
    where id = p_rutina_id and coach_id = auth.uid();
    if not found then raise exception 'La rutina no pertenece al entrenador autenticado'; end if;
  end if;

  update public.clientes
  set rutina_id = p_rutina_id,
      rutina_asignada = coalesce(nombre_rutina, 'Sin Asignar')
  where id = p_cliente_id and coach_id = auth.uid();
  return found;
end;
$$;

-- 9. Creacion y cierre de sesiones con reglas de asistencia.
create or replace function public.crear_sesion_entrenamiento(
  p_cliente_id uuid,
  p_inicio timestamptz,
  p_fin timestamptz,
  p_titulo text,
  p_rutina_id uuid default null,
  p_observaciones text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  sesion_id uuid;
  rutina_efectiva uuid := p_rutina_id;
begin
  if not public.usuario_activo_con_rol('coach') then
    raise exception 'Solo un entrenador activo puede crear sesiones';
  end if;
  if not exists (
    select 1 from public.clientes where id = p_cliente_id and coach_id = auth.uid()
  ) then raise exception 'El cliente no pertenece al entrenador autenticado'; end if;
  if p_inicio is null or p_fin is null or p_fin <= p_inicio or p_fin > p_inicio + interval '8 hours' then
    raise exception 'El rango de la sesion no es valido';
  end if;
  if length(trim(coalesce(p_titulo, ''))) < 3 or length(trim(p_titulo)) > 100 then
    raise exception 'El titulo debe tener entre 3 y 100 caracteres';
  end if;

  if rutina_efectiva is null then
    select rutina_id into rutina_efectiva from public.clientes where id = p_cliente_id;
  elsif not exists (
    select 1 from public.rutinas where id = rutina_efectiva and coach_id = auth.uid()
  ) then raise exception 'La rutina no pertenece al entrenador autenticado'; end if;

  insert into public.sesiones_entrenamiento (
    coach_id, cliente_id, rutina_id, titulo, inicio, fin, observaciones
  ) values (
    auth.uid(), p_cliente_id, rutina_efectiva, trim(p_titulo), p_inicio, p_fin,
    nullif(trim(coalesce(p_observaciones, '')), '')
  ) returning id into sesion_id;
  return sesion_id;
end;
$$;

create or replace function public.actualizar_resultado_sesion(
  p_sesion_id uuid,
  p_estado text,
  p_asistencia text,
  p_observaciones text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  estado_nuevo text := lower(trim(coalesce(p_estado, '')));
  asistencia_nueva text := lower(trim(coalesce(p_asistencia, '')));
begin
  if not public.usuario_activo_con_rol('coach') then
    raise exception 'Solo un entrenador activo puede cerrar sesiones';
  end if;
  if estado_nuevo not in ('programada', 'completada', 'cancelada') then
    raise exception 'Estado de sesion no permitido';
  end if;
  if asistencia_nueva not in ('pendiente', 'presente', 'ausente', 'justificada') then
    raise exception 'Estado de asistencia no permitido';
  end if;
  if estado_nuevo = 'programada' and asistencia_nueva <> 'pendiente' then
    raise exception 'Una sesion programada debe tener asistencia pendiente';
  end if;
  if estado_nuevo = 'completada' and asistencia_nueva = 'pendiente' then
    raise exception 'Indica la asistencia antes de completar la sesion';
  end if;

  update public.sesiones_entrenamiento
  set estado = estado_nuevo,
      asistencia = asistencia_nueva,
      observaciones = nullif(trim(coalesce(p_observaciones, '')), ''),
      finalizada_en = case when estado_nuevo in ('completada', 'cancelada') then now() else null end,
      actualizado_en = now()
  where id = p_sesion_id and coach_id = auth.uid();
  return found;
end;
$$;

-- 10. Consentimiento registrado exclusivamente desde la cuenta del cliente.
create or replace function public.registrar_consentimiento_cliente(
  p_tipo text,
  p_aceptar boolean,
  p_version_documento text default '1.0'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  cliente_actual uuid := public.cliente_id_actual();
  consentimiento_id uuid;
  tipo_normalizado text := lower(trim(coalesce(p_tipo, '')));
  version_normalizada text := nullif(trim(coalesce(p_version_documento, '')), '');
begin
  if cliente_actual is null then raise exception 'Se necesita una cuenta de cliente activa'; end if;
  if tipo_normalizado not in ('tratamiento_datos', 'seguimiento_corporal') then
    raise exception 'Tipo de consentimiento no permitido';
  end if;
  if version_normalizada is null or length(version_normalizada) > 20 then
    raise exception 'Version de documento no valida';
  end if;

  if not p_aceptar then
    update public.consentimientos_datos
    set revocado_en = coalesce(revocado_en, now())
    where cliente_id = cliente_actual
      and tipo = tipo_normalizado
      and estado = 'otorgado'
      and revocado_en is null;
  end if;

  insert into public.consentimientos_datos (
    cliente_id, tipo, estado, version_documento, origen, registrado_por,
    otorgado_en, revocado_en
  ) values (
    cliente_actual,
    tipo_normalizado,
    case when p_aceptar then 'otorgado' else 'revocado' end,
    version_normalizada,
    'portal_cliente',
    auth.uid(),
    case when p_aceptar then now() else null end,
    case when p_aceptar then null else now() end
  ) returning id into consentimiento_id;
  return consentimiento_id;
end;
$$;

-- 11. Reglas RLS del portal y ampliacion de lecturas existentes.
alter table public.cuentas_clientes enable row level security;
alter table public.invitaciones_clientes enable row level security;
alter table public.sesiones_entrenamiento enable row level security;
alter table public.historial_rutinas enable row level security;
alter table public.consentimientos_datos enable row level security;

do $$
declare
  politica record;
begin
  for politica in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'cuentas_clientes', 'invitaciones_clientes', 'sesiones_entrenamiento',
        'historial_rutinas', 'consentimientos_datos'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', politica.policyname, politica.schemaname, politica.tablename);
  end loop;
end $$;

drop policy if exists clientes_leer on public.clientes;
create policy clientes_leer on public.clientes
for select to authenticated
using (
  public.usuario_activo_con_rol('admin')
  or (public.usuario_activo_con_rol('coach') and coach_id = auth.uid())
  or id = public.cliente_id_actual()
);

drop policy if exists rutinas_leer on public.rutinas;
create policy rutinas_leer on public.rutinas
for select to authenticated
using (
  public.usuario_activo_con_rol('admin')
  or (public.usuario_activo_con_rol('coach') and coach_id = auth.uid())
  or public.cliente_puede_ver_rutina(id)
);

drop policy if exists mediciones_leer on public.mediciones;
create policy mediciones_leer on public.mediciones
for select to authenticated
using (
  public.usuario_activo_con_rol('admin')
  or (public.usuario_activo_con_rol('coach') and coach_id = auth.uid())
  or cliente_id = public.cliente_id_actual()
);

drop policy if exists eventos_leer on public.eventos;
create policy eventos_leer on public.eventos
for select to authenticated
using (
  public.usuario_activo_con_rol('admin')
  or (public.usuario_activo_con_rol('coach') and coach_id = auth.uid())
  or cliente_id = public.cliente_id_actual()
);

create policy cuentas_clientes_leer on public.cuentas_clientes
for select to authenticated
using (
  usuario_id = auth.uid()
  or public.usuario_activo_con_rol('admin')
  or exists (
    select 1 from public.clientes c
    where c.id = cuentas_clientes.cliente_id
      and c.coach_id = auth.uid()
      and public.usuario_activo_con_rol('coach')
  )
);

create policy invitaciones_clientes_leer on public.invitaciones_clientes
for select to authenticated
using (creado_por = auth.uid() or public.usuario_activo_con_rol('admin'));

create policy sesiones_leer on public.sesiones_entrenamiento
for select to authenticated
using (
  public.usuario_activo_con_rol('admin')
  or (public.usuario_activo_con_rol('coach') and coach_id = auth.uid())
  or cliente_id = public.cliente_id_actual()
);

create policy historial_rutinas_leer on public.historial_rutinas
for select to authenticated
using (
  public.usuario_activo_con_rol('admin')
  or (public.usuario_activo_con_rol('coach') and coach_id = auth.uid())
  or cliente_id = public.cliente_id_actual()
);

create policy consentimientos_leer on public.consentimientos_datos
for select to authenticated
using (
  public.usuario_activo_con_rol('admin')
  or exists (
    select 1 from public.clientes c
    where c.id = consentimientos_datos.cliente_id
      and c.coach_id = auth.uid()
      and public.usuario_activo_con_rol('coach')
  )
  or cliente_id = public.cliente_id_actual()
);

-- 12. Auditoria, permisos y version del backend.
do $$
declare
  tabla text;
begin
  foreach tabla in array array[
    'cuentas_clientes', 'invitaciones_clientes', 'sesiones_entrenamiento',
    'historial_rutinas', 'consentimientos_datos'
  ]
  loop
    execute format('drop trigger if exists auditoria_cambios on public.%I', tabla);
    execute format(
      'create trigger auditoria_cambios after insert or update or delete on public.%I for each row execute function public.auditar_cambio()',
      tabla
    );
  end loop;
end $$;

revoke all on public.cuentas_clientes, public.invitaciones_clientes,
  public.sesiones_entrenamiento, public.historial_rutinas,
  public.consentimientos_datos from anon;
revoke insert, update, delete on public.cuentas_clientes, public.invitaciones_clientes,
  public.sesiones_entrenamiento, public.historial_rutinas,
  public.consentimientos_datos from authenticated;
grant select on public.cuentas_clientes, public.invitaciones_clientes,
  public.sesiones_entrenamiento, public.historial_rutinas,
  public.consentimientos_datos to authenticated;

revoke all on function public.cliente_id_actual() from public;
revoke all on function public.usuario_es_cliente_activo() from public;
revoke all on function public.cliente_puede_ver_rutina(uuid) from public;
revoke all on function public.obtener_mi_perfil_cliente() from public;
revoke all on function public.crear_invitacion_cliente(uuid, integer) from public;
revoke all on function public.validar_invitacion_cliente(text, text) from public;
revoke all on function public.revocar_invitacion_cliente(uuid) from public;
revoke all on function public.cambiar_estado_portal_cliente(uuid, text) from public;
revoke all on function public.registrar_historial_rutina() from public;
revoke all on function public.asignar_rutina_cliente(uuid, uuid) from public;
revoke all on function public.crear_sesion_entrenamiento(uuid, timestamptz, timestamptz, text, uuid, text) from public;
revoke all on function public.actualizar_resultado_sesion(uuid, text, text, text) from public;
revoke all on function public.registrar_consentimiento_cliente(text, boolean, text) from public;
revoke all on function public.crear_perfil_desde_auth(uuid, text, jsonb) from public;

grant execute on function public.cliente_id_actual() to authenticated;
grant execute on function public.usuario_es_cliente_activo() to authenticated;
grant execute on function public.cliente_puede_ver_rutina(uuid) to authenticated;
grant execute on function public.obtener_mi_perfil_cliente() to authenticated;
grant execute on function public.crear_invitacion_cliente(uuid, integer) to authenticated;
grant execute on function public.validar_invitacion_cliente(text, text) to anon, authenticated;
grant execute on function public.revocar_invitacion_cliente(uuid) to authenticated;
grant execute on function public.cambiar_estado_portal_cliente(uuid, text) to authenticated;
grant execute on function public.asignar_rutina_cliente(uuid, uuid) to authenticated;
grant execute on function public.crear_sesion_entrenamiento(uuid, timestamptz, timestamptz, text, uuid, text) to authenticated;
grant execute on function public.actualizar_resultado_sesion(uuid, text, text, text) to authenticated;
grant execute on function public.registrar_consentimiento_cliente(text, boolean, text) to authenticated;

insert into public.app_migraciones (version, descripcion)
values ('1.3.1', 'Fase 3: sesiones, asistencia, historial, portal, consentimiento y correccion de invitaciones')
on conflict (version) do update
set descripcion = excluded.descripcion,
    aplicada_en = now();

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
      (
        select m.version
        from public.app_migraciones m
        order by
          split_part(m.version, '.', 1)::integer desc,
          split_part(m.version, '.', 2)::integer desc,
          split_part(m.version, '.', 3)::integer desc
        limit 1
      ),
      '1.1.0'
    )
  );
$$;

do $$
declare
  tabla text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach tabla in array array[
      'cuentas_clientes', 'invitaciones_clientes', 'sesiones_entrenamiento',
      'historial_rutinas', 'consentimientos_datos'
    ]
    loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = tabla
      ) then
        execute format('alter publication supabase_realtime add table public.%I', tabla);
      end if;
    end loop;
  end if;
end $$;

notify pgrst, 'reload schema';

commit;
