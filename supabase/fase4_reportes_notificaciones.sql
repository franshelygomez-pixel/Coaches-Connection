-- Coaches Connection - Fase 4 de la Opcion B
-- Notificaciones internas, reportes por periodos y optimizacion de consultas.
-- Requisitos: setup.sql, fase2_seguridad.sql y fase3_procesos.sql/correccion 1.3.1.
-- Esta migracion es incremental: no elimina tablas ni registros existentes.

begin;

-- 1. Bandeja de notificaciones interna.
create table if not exists public.notificaciones (
  id uuid primary key default extensions.gen_random_uuid(),
  destinatario_id uuid not null references auth.users(id) on delete cascade,
  creado_por uuid references auth.users(id) on delete set null,
  tipo text not null default 'sistema'
    check (tipo in ('sistema', 'solicitud', 'cuenta', 'sesion', 'asistencia', 'rutina', 'acceso')),
  titulo text not null check (char_length(trim(titulo)) between 3 and 120),
  mensaje text not null check (char_length(trim(mensaje)) between 3 and 500),
  enlace text check (enlace is null or char_length(enlace) <= 160),
  leida boolean not null default false,
  leida_en timestamptz,
  creado_en timestamptz not null default now(),
  vence_en timestamptz,
  constraint notificacion_lectura_coherente check (
    (leida = false and leida_en is null) or (leida = true and leida_en is not null)
  )
);

create index if not exists notificaciones_destinatario_estado_fecha_idx
  on public.notificaciones(destinatario_id, leida, creado_en desc);
create index if not exists notificaciones_vencimiento_idx
  on public.notificaciones(vence_en)
  where vence_en is not null;

-- 2. Indices para la escala prevista: 20 entrenadores, 1000 clientes y 6 administradores.
create index if not exists clientes_coach_estado_nombre_idx
  on public.clientes(coach_id, estado, nombre, apellido);
create index if not exists clientes_estado_creado_idx
  on public.clientes(estado, creado_en desc);
create index if not exists usuarios_rol_estado_creado_idx
  on public.usuarios(rol, estado, creado_en desc);
create index if not exists rutinas_coach_creado_idx
  on public.rutinas(coach_id, creado_en desc);
create index if not exists sesiones_coach_inicio_estado_idx
  on public.sesiones_entrenamiento(coach_id, inicio desc, estado, asistencia);
create index if not exists sesiones_cliente_inicio_estado_idx
  on public.sesiones_entrenamiento(cliente_id, inicio desc, estado, asistencia);

-- 3. Funcion interna para que los triggers creen avisos consistentes.
create or replace function public.crear_notificacion_interna(
  p_destinatario_id uuid,
  p_tipo text,
  p_titulo text,
  p_mensaje text,
  p_enlace text default null,
  p_creado_por uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  id_generado uuid;
  tipo_normalizado text := lower(trim(coalesce(p_tipo, 'sistema')));
begin
  if p_destinatario_id is null or not exists (
    select 1 from auth.users as a where a.id = p_destinatario_id
  ) then
    return null;
  end if;
  if tipo_normalizado not in ('sistema', 'solicitud', 'cuenta', 'sesion', 'asistencia', 'rutina', 'acceso') then
    tipo_normalizado := 'sistema';
  end if;
  if char_length(trim(coalesce(p_titulo, ''))) not between 3 and 120 then
    raise exception 'Titulo de notificacion no permitido';
  end if;
  if char_length(trim(coalesce(p_mensaje, ''))) not between 3 and 500 then
    raise exception 'Mensaje de notificacion no permitido';
  end if;

  insert into public.notificaciones (
    destinatario_id, creado_por, tipo, titulo, mensaje, enlace
  ) values (
    p_destinatario_id,
    p_creado_por,
    tipo_normalizado,
    trim(p_titulo),
    trim(p_mensaje),
    nullif(trim(coalesce(p_enlace, '')), '')
  ) returning id into id_generado;

  return id_generado;
end;
$$;

-- 4. Avisos automaticos por solicitudes y decisiones de cuentas.
create or replace function public.notificar_cambio_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  administrador record;
  nombre_visible text := trim(coalesce(new.nombre, '') || ' ' || coalesce(new.apellido, ''));
begin
  if tg_op = 'INSERT' and lower(new.estado::text) = 'pendiente' then
    for administrador in
      select u.id
      from public.usuarios as u
      where lower(u.rol::text) = 'admin' and lower(u.estado::text) = 'activo'
    loop
      perform public.crear_notificacion_interna(
        administrador.id,
        'solicitud',
        'Nueva solicitud de acceso',
        coalesce(nullif(nombre_visible, ''), new.email) || ' envio una solicitud para ingresar.',
        '#/Solicitudes',
        new.id
      );
    end loop;
  elsif tg_op = 'UPDATE' and old.estado is distinct from new.estado then
    perform public.crear_notificacion_interna(
      new.id,
      'cuenta',
      'Estado de cuenta actualizado',
      'El estado de tu cuenta ahora es ' || upper(new.estado::text) || '.',
      '#/Inicio',
      auth.uid()
    );
  end if;
  return new;
end;
$$;

drop trigger if exists notificar_cambio_usuario on public.usuarios;
create trigger notificar_cambio_usuario
after insert or update on public.usuarios
for each row execute function public.notificar_cambio_usuario();

-- 5. Avisos automaticos para el portal del cliente.
create or replace function public.notificar_sesion_cliente()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  usuario_cliente uuid;
  fecha_visible text;
begin
  select cc.usuario_id into usuario_cliente
  from public.cuentas_clientes as cc
  where cc.cliente_id = new.cliente_id and cc.estado = 'activo'
  limit 1;

  if usuario_cliente is null then return new; end if;
  fecha_visible := to_char(new.inicio at time zone 'America/Santo_Domingo', 'DD/MM/YYYY HH24:MI');

  if tg_op = 'INSERT' then
    perform public.crear_notificacion_interna(
      usuario_cliente,
      'sesion',
      'Nueva sesion programada',
      trim(new.titulo) || ' - ' || fecha_visible || '.',
      '#/Mis sesiones',
      new.coach_id
    );
  elsif old.estado is distinct from new.estado or old.asistencia is distinct from new.asistencia then
    perform public.crear_notificacion_interna(
      usuario_cliente,
      'asistencia',
      'Resultado de sesion actualizado',
      trim(new.titulo) || ': ' || upper(new.estado) || ' / ' || upper(new.asistencia) || '.',
      '#/Mis sesiones',
      new.coach_id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists notificar_sesion_cliente on public.sesiones_entrenamiento;
create trigger notificar_sesion_cliente
after insert or update on public.sesiones_entrenamiento
for each row execute function public.notificar_sesion_cliente();

create or replace function public.notificar_rutina_cliente()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  usuario_cliente uuid;
begin
  select cc.usuario_id into usuario_cliente
  from public.cuentas_clientes as cc
  where cc.cliente_id = new.cliente_id and cc.estado = 'activo'
  limit 1;

  if usuario_cliente is not null then
    perform public.crear_notificacion_interna(
      usuario_cliente,
      'rutina',
      'Rutina asignada',
      'Tu entrenador asigno la rutina ' || trim(new.nombre_rutina) || '.',
      '#/Mi rutina',
      new.coach_id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists notificar_rutina_cliente on public.historial_rutinas;
create trigger notificar_rutina_cliente
after insert on public.historial_rutinas
for each row execute function public.notificar_rutina_cliente();

-- 6. Operaciones seguras de la bandeja.
create or replace function public.marcar_notificacion_leida(p_notificacion_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.notificaciones as n
  set leida = true,
      leida_en = coalesce(n.leida_en, now())
  where n.id = p_notificacion_id and n.destinatario_id = auth.uid();
  return found;
end;
$$;

create or replace function public.marcar_todas_notificaciones_leidas()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  cantidad integer;
begin
  update public.notificaciones as n
  set leida = true, leida_en = now()
  where n.destinatario_id = auth.uid() and n.leida = false;
  get diagnostics cantidad = row_count;
  return cantidad;
end;
$$;

-- 7. Validacion comun de periodos para los reportes.
create or replace function public.periodo_reporte_valido(p_desde date, p_hasta date)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_desde is not null
    and p_hasta is not null
    and p_hasta >= p_desde
    and p_hasta <= p_desde + 366;
$$;

-- 8. Resumen agregado. Evita descargar expedientes para calcular indicadores.
create or replace function public.reporte_resumen_operativo(
  p_desde date,
  p_hasta date,
  p_coach_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  coach_efectivo uuid;
  es_admin boolean := public.usuario_activo_con_rol('admin');
  es_coach boolean := public.usuario_activo_con_rol('coach');
  resultado jsonb;
begin
  if not (es_admin or es_coach) then
    raise exception 'No tienes permiso para consultar reportes';
  end if;
  if not public.periodo_reporte_valido(p_desde, p_hasta) then
    raise exception 'El periodo debe estar entre 1 y 367 dias';
  end if;

  coach_efectivo := case when es_coach then auth.uid() else p_coach_id end;
  if es_admin and coach_efectivo is not null and not exists (
    select 1 from public.usuarios as u
    where u.id = coach_efectivo and lower(u.rol::text) = 'coach'
  ) then
    raise exception 'Entrenador de reporte no valido';
  end if;

  with clientes_filtrados as (
    select c.id, c.estado, c.rutina_id
    from public.clientes as c
    where coach_efectivo is null or c.coach_id = coach_efectivo
  ),
  sesiones_filtradas as (
    select s.estado, s.asistencia
    from public.sesiones_entrenamiento as s
    where (coach_efectivo is null or s.coach_id = coach_efectivo)
      and s.inicio >= p_desde::timestamptz
      and s.inicio < (p_hasta + 1)::timestamptz
  )
  select jsonb_build_object(
    'desde', p_desde,
    'hasta', p_hasta,
    'coach_id', coach_efectivo,
    'clientes_total', (select count(*) from clientes_filtrados),
    'clientes_activos', (select count(*) from clientes_filtrados as c where lower(c.estado::text) = 'activo'),
    'clientes_sin_rutina', (select count(*) from clientes_filtrados as c where c.rutina_id is null),
    'portales_activos', (
      select count(*)
      from public.cuentas_clientes as cc
      join public.clientes as c on c.id = cc.cliente_id
      where cc.estado = 'activo' and (coach_efectivo is null or c.coach_id = coach_efectivo)
    ),
    'rutinas_total', (
      select count(*) from public.rutinas as r
      where coach_efectivo is null or r.coach_id = coach_efectivo
    ),
    'sesiones_total', (select count(*) from sesiones_filtradas),
    'sesiones_programadas', (select count(*) from sesiones_filtradas as s where s.estado = 'programada'),
    'sesiones_completadas', (select count(*) from sesiones_filtradas as s where s.estado = 'completada'),
    'sesiones_canceladas', (select count(*) from sesiones_filtradas as s where s.estado = 'cancelada'),
    'asistencias', (select count(*) from sesiones_filtradas as s where s.asistencia = 'presente'),
    'ausencias', (select count(*) from sesiones_filtradas as s where s.asistencia = 'ausente'),
    'justificadas', (select count(*) from sesiones_filtradas as s where s.asistencia = 'justificada'),
    'porcentaje_asistencia', coalesce((
      select round(
        100.0 * count(*) filter (where s.asistencia = 'presente')
        / nullif(count(*) filter (where s.asistencia in ('presente', 'ausente', 'justificada')), 0),
        2
      )
      from sesiones_filtradas as s
    ), 0)
  ) into resultado;

  return resultado;
end;
$$;

-- 9. Comparacion administrativa por entrenador con paginacion en PostgreSQL.
create or replace function public.reporte_entrenadores_paginado(
  p_desde date,
  p_hasta date,
  p_pagina integer default 1,
  p_por_pagina integer default 20
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  pagina_segura integer := greatest(coalesce(p_pagina, 1), 1);
  cantidad_segura integer := least(greatest(coalesce(p_por_pagina, 20), 1), 100);
  desplazamiento integer;
  resultado jsonb;
begin
  if not public.usuario_activo_con_rol('admin') then
    raise exception 'Solo un administrador puede comparar entrenadores';
  end if;
  if not public.periodo_reporte_valido(p_desde, p_hasta) then
    raise exception 'El periodo debe estar entre 1 y 367 dias';
  end if;
  desplazamiento := (pagina_segura - 1) * cantidad_segura;

  select jsonb_build_object(
    'total', (
      select count(*) from public.usuarios as u
      where lower(u.rol::text) = 'coach'
    ),
    'pagina', pagina_segura,
    'por_pagina', cantidad_segura,
    'items', coalesce((
      select jsonb_agg(to_jsonb(fila) order by fila.nombre, fila.coach_id)
      from (
        select
          u.id as coach_id,
          trim(coalesce(u.nombre, '') || ' ' || coalesce(u.apellido, '')) as nombre,
          u.email,
          u.estado::text as estado,
          (select count(*) from public.clientes as c where c.coach_id = u.id) as clientes_total,
          (select count(*) from public.clientes as c where c.coach_id = u.id and lower(c.estado::text) = 'activo') as clientes_activos,
          (select count(*) from public.rutinas as r where r.coach_id = u.id) as rutinas_total,
          (select count(*) from public.sesiones_entrenamiento as s
            where s.coach_id = u.id and s.inicio >= p_desde::timestamptz and s.inicio < (p_hasta + 1)::timestamptz) as sesiones_total,
          (select count(*) from public.sesiones_entrenamiento as s
            where s.coach_id = u.id and s.estado = 'completada'
              and s.inicio >= p_desde::timestamptz and s.inicio < (p_hasta + 1)::timestamptz) as sesiones_completadas,
          (select count(*) from public.sesiones_entrenamiento as s
            where s.coach_id = u.id and s.asistencia = 'presente'
              and s.inicio >= p_desde::timestamptz and s.inicio < (p_hasta + 1)::timestamptz) as asistencias,
          (select count(*) from public.sesiones_entrenamiento as s
            where s.coach_id = u.id and s.asistencia = 'ausente'
              and s.inicio >= p_desde::timestamptz and s.inicio < (p_hasta + 1)::timestamptz) as ausencias
        from public.usuarios as u
        where lower(u.rol::text) = 'coach'
        order by u.nombre, u.apellido, u.id
        limit cantidad_segura offset desplazamiento
      ) as fila
    ), '[]'::jsonb)
  ) into resultado;

  return resultado;
end;
$$;

-- 10. Detalle de sesiones paginado y protegido por rol.
create or replace function public.reporte_sesiones_paginado(
  p_desde date,
  p_hasta date,
  p_pagina integer default 1,
  p_por_pagina integer default 20,
  p_estado text default null,
  p_coach_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  pagina_segura integer := greatest(coalesce(p_pagina, 1), 1);
  cantidad_segura integer := least(greatest(coalesce(p_por_pagina, 20), 1), 100);
  desplazamiento integer;
  estado_filtro text := nullif(lower(trim(coalesce(p_estado, ''))), '');
  coach_efectivo uuid;
  es_admin boolean := public.usuario_activo_con_rol('admin');
  es_coach boolean := public.usuario_activo_con_rol('coach');
  resultado jsonb;
begin
  if not (es_admin or es_coach) then
    raise exception 'No tienes permiso para consultar sesiones';
  end if;
  if not public.periodo_reporte_valido(p_desde, p_hasta) then
    raise exception 'El periodo debe estar entre 1 y 367 dias';
  end if;
  if estado_filtro is not null and estado_filtro not in (
    'programada', 'completada', 'cancelada', 'presente', 'ausente', 'justificada', 'pendiente'
  ) then
    raise exception 'Filtro de sesion no permitido';
  end if;

  coach_efectivo := case when es_coach then auth.uid() else p_coach_id end;
  desplazamiento := (pagina_segura - 1) * cantidad_segura;

  with sesiones_base as (
    select
      s.id,
      s.titulo,
      s.inicio,
      s.fin,
      s.estado,
      s.asistencia,
      s.coach_id,
      trim(coalesce(c.nombre, '') || ' ' || coalesce(c.apellido, '')) as cliente,
      trim(coalesce(u.nombre, '') || ' ' || coalesce(u.apellido, '')) as entrenador,
      r.nombre as rutina
    from public.sesiones_entrenamiento as s
    join public.clientes as c on c.id = s.cliente_id
    join public.usuarios as u on u.id = s.coach_id
    left join public.rutinas as r on r.id = s.rutina_id
    where (coach_efectivo is null or s.coach_id = coach_efectivo)
      and s.inicio >= p_desde::timestamptz
      and s.inicio < (p_hasta + 1)::timestamptz
      and (
        estado_filtro is null
        or s.estado = estado_filtro
        or s.asistencia = estado_filtro
      )
  )
  select jsonb_build_object(
    'total', (select count(*) from sesiones_base),
    'pagina', pagina_segura,
    'por_pagina', cantidad_segura,
    'items', coalesce((
      select jsonb_agg(to_jsonb(fila) order by fila.inicio desc, fila.id)
      from (
        select * from sesiones_base as sb
        order by sb.inicio desc, sb.id
        limit cantidad_segura offset desplazamiento
      ) as fila
    ), '[]'::jsonb)
  ) into resultado;

  return resultado;
end;
$$;

-- 11. RLS y permisos.
alter table public.notificaciones enable row level security;
drop policy if exists notificaciones_leer_propias on public.notificaciones;
create policy notificaciones_leer_propias on public.notificaciones
for select to authenticated
using (
  destinatario_id = auth.uid()
  and (vence_en is null or vence_en > now())
);

revoke all on public.notificaciones from anon;
revoke insert, update, delete on public.notificaciones from authenticated;
grant select on public.notificaciones to authenticated;

revoke all on function public.crear_notificacion_interna(uuid, text, text, text, text, uuid) from public;
revoke all on function public.notificar_cambio_usuario() from public;
revoke all on function public.notificar_sesion_cliente() from public;
revoke all on function public.notificar_rutina_cliente() from public;
revoke all on function public.marcar_notificacion_leida(uuid) from public;
revoke all on function public.marcar_todas_notificaciones_leidas() from public;
revoke all on function public.periodo_reporte_valido(date, date) from public;
revoke all on function public.reporte_resumen_operativo(date, date, uuid) from public;
revoke all on function public.reporte_entrenadores_paginado(date, date, integer, integer) from public;
revoke all on function public.reporte_sesiones_paginado(date, date, integer, integer, text, uuid) from public;

grant execute on function public.marcar_notificacion_leida(uuid) to authenticated;
grant execute on function public.marcar_todas_notificaciones_leidas() to authenticated;
grant execute on function public.reporte_resumen_operativo(date, date, uuid) to authenticated;
grant execute on function public.reporte_entrenadores_paginado(date, date, integer, integer) to authenticated;
grant execute on function public.reporte_sesiones_paginado(date, date, integer, integer, text, uuid) to authenticated;

-- 12. Registro de version y Realtime.
insert into public.app_migraciones (version, descripcion)
values ('1.4.0', 'Fase 4: notificaciones, reportes por periodos, paginacion e indices')
on conflict (version) do update
set descripcion = excluded.descripcion,
    aplicada_en = now();

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'notificaciones'
    ) then
    alter publication supabase_realtime add table public.notificaciones;
  end if;
end $$;

notify pgrst, 'reload schema';

commit;
